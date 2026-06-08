// index.js - Worker and Retrieval Functions Combined (using Express for 2nd Gen Cloud Functions)

const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Firestore } = require('@google-cloud/firestore');
const express = require('express');
const rateLimit = require('express-rate-limit');

// ===================================================
// CONFIGURATION & CONSTANTS
// ===================================================

const PORT = process.env.PORT || 8080;
const GCP_PROJECT = process.env.GCP_PROJECT;
const COLLECTION_NAME = 'dashboard';
const DOCUMENT_ID = 'latest_immigration_log';
const MODEL_ID = 'gemini-2.5-pro';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CACHE_TTL_SECONDS = 3600; // 1 hour

// ===================================================
// INITIALIZATION
// ===================================================

const app = express();
const secretManagerClient = new SecretManagerServiceClient();
const db = new Firestore();

let secretCache = null;
let secretCacheTime = null;

// ===================================================
// LOGGING
// ===================================================

function logInfo(message, context = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    ...context
  }));
}

function logError(message, error, context = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    error: error?.message || error,
    stack: error?.stack,
    ...context
  }));
}

function logWarn(message, context = {}) {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message,
    ...context
  }));
}

// ===================================================
// HELPERS
// ===================================================

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error?.status === 429 || error?.message?.includes('429'))) {
      logWarn(`Rate limited. Retrying in ${delay}ms`, { retriesLeft: retries });
      await wait(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function getGeminiApiKey() {
  // Check cache first
  if (secretCache && secretCacheTime && (Date.now() - secretCacheTime) < CACHE_TTL_SECONDS * 1000) {
    logInfo('Using cached Gemini API key');
    return secretCache;
  }

  if (!GCP_PROJECT) {
    throw new Error('GCP_PROJECT environment variable not set');
  }

  const name = `projects/${GCP_PROJECT}/secrets/GEMINI_API_KEY/versions/latest`;
  
  try {
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    const apiKey = version.payload.data.toString().trim();
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is empty');
    }
    
    secretCache = apiKey;
    secretCacheTime = Date.now();
    logInfo('Gemini API key retrieved successfully');
    
    return apiKey;
  } catch (error) {
    logError('Failed to retrieve GEMINI_API_KEY from Secret Manager', error, {
      project: GCP_PROJECT,
      hint: 'Ensure the service account has secretmanager.secretAccessor role'
    });
    throw error;
  }
}

function generateImmigrationPrompt() {
  return `
    ROLE: Legislative Compliance Auditor & Policy Historian
    MANDATE: Conduct an exhaustive, chronological audit of all UK Immigration rule changes since 2023.
    
    OUTPUT FORMAT: Must be a single JSON array of objects with EXACTLY these keys:
    [
      {
        "policyDate": "YYYY-MM-DD",
        "title": "Short title of the change",
        "summary": "Detailed, paragraph summary of who is affected, what the change is, and the effective date.",
        "sourceLink": "URL to the official UK government source (Gov.uk)."
      }
    ]
    
    REQUIREMENTS:
    1. Return ONLY valid JSON. No markdown, no text outside the array.
    2. Include all major policy changes, rule updates, and salary threshold changes.
    3. Ensure all sourceLink values point to official Gov.uk URLs.
    4. Order entries chronologically from oldest to newest.
    
    Execute the search and analysis based on the full legislative history...
  `;
}

function validateImmigrationData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Invalid response format: expected JSON array');
  }

  const validated = data.filter(item => {
    if (!item.policyDate || !item.title || !item.summary) {
      logWarn('Skipping invalid data item - missing required fields', { item });
      return false;
    }
    return true;
  });

  if (validated.length === 0) {
    throw new Error('No valid immigration data items found in response');
  }

  return validated;
}

function parseGeminiResponse(text) {
  let cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return validateImmigrationData(parsed);
}

// ===================================================
// BUSINESS LOGIC
// ===================================================

async function fetchAndRefreshData() {
  logInfo('Starting immigration data refresh');
  const startTime = Date.now();
  
  try {
    const apiKey = await getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const parsedData = await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: generateImmigrationPrompt(),
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      return parseGeminiResponse(response.text);
    });

    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
    await docRef.set({
      timestamp: new Date().toISOString(),
      status: 'Success',
      data: parsedData,
      itemCount: parsedData.length
    });

    const duration = Date.now() - startTime;
    logInfo('Data refresh successful', {
      itemCount: parsedData.length,
      durationMs: duration
    });

    return parsedData;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Data refresh failed', error, { durationMs: duration });
    
    // Write error state to Firestore for monitoring
    await db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
      timestamp: new Date().toISOString(),
      status: 'Failed',
      error: error.message || 'Unknown error',
      itemCount: 0
    });

    throw error;
  }
}

async function retrieveLatestData() {
  try {
    logInfo('Retrieving latest immigration data from Firestore');
    
    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
    const doc = await docRef.get();

    if (!doc.exists) {
      logWarn('No data document found in Firestore');
      return null;
    }

    const data = doc.data();
    
    if (!data.data || !Array.isArray(data.data)) {
      logWarn('Invalid data structure in Firestore document');
      return null;
    }

    logInfo('Data retrieved successfully', {
      itemCount: data.itemCount,
      status: data.status
    });

    return data;
  } catch (error) {
    logError('Error retrieving data from Firestore', error);
    throw error;
  }
}

// ===================================================
// MIDDLEWARE
// ===================================================

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logInfo(`${req.method} ${req.path}`);
  next();
});

// Rate limiting for refresh endpoint
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit to 5 refreshes per hour
  message: 'Too many refresh requests',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for retrieval endpoint
const retrievalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false
});

// ===================================================
// ROUTE HANDLERS
// ===================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/refreshImmigrationData', refreshLimiter, async (req, res) => {
  try {
    const data = await fetchAndRefreshData();
    res.status(200).json({
      success: true,
      message: 'Data refresh complete',
      itemCount: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Refresh endpoint error', error);
    const statusCode = error.message?.includes('API key') ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Data refresh failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/getDashboardData', retrievalLimiter, async (req, res) => {
  try {
    const docData = await retrieveLatestData();

    if (!docData || !docData.data) {
      logWarn('No data available - returning 503');
      return res.status(503).json({
        success: false,
        error: 'Data is currently unavailable. Please check back after the next scheduled update.',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: docData.data,
      metadata: {
        timestamp: docData.timestamp,
        status: docData.status,
        itemCount: docData.itemCount
      }
    });
  } catch (error) {
    logError('Retrieval endpoint error', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving data',
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback route handler (for direct Cloud Function URL calls)
app.get('/', (req, res) => {
  const host = req.headers.host || '';
  
  if (host.toLowerCase().includes('refreshimmigrationdata')) {
    return app._router.stack.find(r => r.route?.path === '/refreshImmigrationData')?.handle(req, res);
  } else if (host.toLowerCase().includes('getdashboarddata')) {
    return app._router.stack.find(r => r.route?.path === '/getDashboardData')?.handle(req, res);
  }
  
  res.status(404).json({
    success: false,
    error: 'Service not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logError('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ===================================================
// SERVER STARTUP
// ===================================================

app.listen(PORT, () => {
  logInfo(`Server listening on port ${PORT}`, {
    project: GCP_PROJECT,
    collection: COLLECTION_NAME,
    model: MODEL_ID
  });
});
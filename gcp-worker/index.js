// index.js - Updated with December 2025 Model and Exhaustive Prompt
const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Firestore } = require('@google-cloud/firestore');

// ===================================================
// CONSTANTS
// ===================================================

const PROJECT_ID = process.env.GCP_PROJECT || 'gen-lang-client-0461004021';
const COLLECTION_NAME = 'dashboard';
const DOCUMENT_ID = 'latest_immigration_log';
const METRICS_DOCUMENT_ID = 'metrics_log';
const MODEL_ID = 'gemini-2.0-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_TIMEOUT = 30000;
const FIRESTORE_TIMEOUT = 10000;
const CACHE_TTL_MINUTES = 30;
const EXPECTED_FRONTEND_API_KEY = process.env.FRONTEND_API_KEY;

// ===================================================
// STATE
// ===================================================

let secretManagerClient = null;
let db = null;
let cachedData = null;
let cacheTimestamp = null;
let initError = null;
let isInitializing = false;
let initPromise = null;

// ===================================================
// LOGGING & MONITORING
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
    error: error?.message || String(error),
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
// INITIALIZATION
// ===================================================

async function initializeClients() {
  // Prevent multiple simultaneous initialization attempts
  if (isInitializing) {
    return initPromise;
  }
  
  if (db && secretManagerClient && !initError) {
    return true;
  }
  
  isInitializing = true;
  
  initPromise = (async () => {
    try {
      if (!secretManagerClient) {
        secretManagerClient = new SecretManagerServiceClient();
        logInfo('Secret Manager client initialized');
      }
      
      if (!db) {
        db = new Firestore({ projectId: PROJECT_ID });
        logInfo('Firestore client initialized');
      }
      
      initError = null;
      return true;
    } catch (error) {
      initError = error;
      logError('Failed to initialize clients', error, { project: PROJECT_ID });
      return false;
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

// ===================================================
// CACHING
// ===================================================

function isCacheValid() {
  if (!cachedData || !cacheTimestamp) return false;
  const ageMinutes = (Date.now() - cacheTimestamp) / (1000 * 60);
  return ageMinutes < CACHE_TTL_MINUTES;
}

function getCachedData() {
  if (isCacheValid()) {
    logInfo('Returning cached immigration data', {
      itemCount: cachedData?.length || 0,
      ageMinutes: Math.round((Date.now() - cacheTimestamp) / (1000 * 60))
    });
    return cachedData;
  }
  cachedData = null;
  cacheTimestamp = null;
  return null;
}

function setCachedData(data) {
  if (!Array.isArray(data)) {
    logWarn('Invalid data type for cache', { type: typeof data });
    return;
  }
  
  cachedData = [...data];
  cacheTimestamp = Date.now();
  logInfo('Immigration data cached', { 
    ttlMinutes: CACHE_TTL_MINUTES,
    itemCount: data.length 
  });
}

function clearCache() {
  cachedData = null;
  cacheTimestamp = null;
  logInfo('Cache cleared');
}

// ===================================================
// HELPERS
// ===================================================

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isRateLimited = error?.status === 429 || error?.message?.includes('429');
      const isRetryable = error?.status >= 500 || isRateLimited;
      
      if (attempt < retries && isRetryable) {
        logWarn(`Retryable error. Attempting ${attempt + 1}/${retries}`, {
          status: error?.status,
          delayMs: delay
        });
        await wait(delay);
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

async function getGeminiApiKey() {
  try {
    if (!secretManagerClient) {
      throw new Error('Secret Manager client not initialized');
    }
    
    const name = `projects/${PROJECT_ID}/secrets/GEMINI_API_KEY/versions/latest`;
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    const apiKey = version.payload.data.toString().trim();
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is empty');
    }
    
    return apiKey;
  } catch (error) {
    logError('Failed to retrieve GEMINI_API_KEY', error, { project: PROJECT_ID });
    throw error;
  }
}

function getFirestoreClient() {
  if (!db) {
    throw new Error('Firestore client not initialized');
  }
  return db;
}

function generatePrompt() {
  return `
    ROLE: Legislative Compliance Auditor.
    TASK: Conduct an exhaustive chronological audit of UK Immigration rule changes from 2024 through December 2025.
    
    FOCUS AREAS:
    1. The May 2025 White Paper "Restoring Control" (10-year settlement rules).
    2. Skilled Worker RQF Level 6 increases and July 2025 salary threshold hikes.
    3. Graduate Visa reduction to 18 months (effective Jan 2027 but announced late 2025).
    4. English Language requirement increases (B1 to B2) for 2026.
    5. New Care Worker sponsorship bans from July 2025.

    FORMAT: Return ONLY a JSON array of objects.
    REQUIRED KEYS: "date" (e.g., "July 2025"), "summary" (detailed explanation).
    NO MARKDOWN. NO TEXT OUTSIDE THE ARRAY.
  `;
}

function validateDataStructure(data) {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of immigration updates, got ' + typeof data);
  }
  
  if (data.length === 0) {
    logWarn('Empty data array received from Gemini');
  }
  
  return data.filter(item => {
    if (!item.date || !item.summary) {
      logWarn('Skipping invalid data item');
      return false;
    }
    return true;
  });
}

function parseGeminiResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid response from Gemini API');
  }
  
  let cleaned = text.trim()
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  
  const jsonMatch = cleaned.match(/(\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    return validateDataStructure(parsed);
  } catch (error) {
    logError('Failed to parse Gemini response', error);
    throw new Error('Invalid JSON in Gemini response');
  }
}

async function fetchImmigrationData(ai) {
  return retryWithBackoff(async () => {
    logInfo('Fetching immigration data from Gemini');
    const startTime = Date.now();
    
    const response = await Promise.race([
      ai.models.generateContent({
        model: MODEL_ID,
        contents: generatePrompt(),
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: 'medium' }
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      )
    ]);

    if (!response?.text) {
      throw new Error('Empty response from Gemini API');
    }

    const data = parseGeminiResponse(response.text);
    const duration = Date.now() - startTime;
    
    logInfo('Immigration data fetched', {
      itemCount: data.length,
      durationMs: duration
    });
    
    return data;
  });
}

async function saveToFirestore(data) {
  try {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    const firestoreDb = getFirestoreClient();
    const timestamp = new Date().toISOString();
    
    const savePromise = firestoreDb.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
      timestamp,
      status: 'Success',
      data: data,
      itemCount: data.length,
      lastUpdated: timestamp
    });
    
    await Promise.race([
      savePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore save timeout')), FIRESTORE_TIMEOUT)
      )
    ]);
    
    logInfo('Data saved to Firestore', { itemCount: data.length });
  } catch (error) {
    logError('Failed to save data to Firestore', error);
    throw error;
  }
}

async function saveMetrics(metrics) {
  try {
    if (!metrics || typeof metrics !== 'object') {
      logWarn('Invalid metrics object');
      return;
    }
    
    const firestoreDb = getFirestoreClient();
    const timestamp = new Date().toISOString();
    
    await Promise.race([
      firestoreDb.collection(COLLECTION_NAME).doc(METRICS_DOCUMENT_ID).set(
        {
          ...metrics,
          timestamp,
          lastUpdated: timestamp
        },
        { merge: true }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Metrics save timeout')), FIRESTORE_TIMEOUT)
      )
    ]);
  } catch (error) {
    logError('Failed to save metrics', error);
  }
}

function setCorsHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
}

function validateApiKey(apiKey) {
  if (!EXPECTED_FRONTEND_API_KEY) {
    return false;
  }
  
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  return apiKey === EXPECTED_FRONTEND_API_KEY;
}

// ===================================================
// CLOUD FUNCTION EXPORTS
// ===================================================

exports.refreshImmigrationData = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const startTime = Date.now();
  const metrics = {
    endpoint: 'refreshImmigrationData',
    status: 'unknown',
    durationMs: 0,
    itemCount: 0,
    error: null,
    source: 'gemini'
  };
  
  try {
    await initializeClients();
    
    if (initError) {
      throw initError;
    }
    
    logInfo('Refresh request received');
    
    const apiKey = await getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const parsedData = await fetchImmigrationData(ai);
    await saveToFirestore(parsedData);
    setCachedData(parsedData);

    metrics.status = 'success';
    metrics.itemCount = parsedData.length;
    metrics.durationMs = Date.now() - startTime;
    
    await saveMetrics(metrics);

    logInfo('Refresh completed successfully', metrics);
    
    res.status(200).json({
      success: true,
      message: 'Data refresh successful',
      count: parsedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    metrics.status = 'error';
    metrics.error = error.message;
    metrics.durationMs = Date.now() - startTime;
    
    await saveMetrics(metrics).catch(() => {});
    
    logError('Refresh failed', error, metrics);
    
    const statusCode = error.message?.includes('API key') ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Refresh failed',
      timestamp: new Date().toISOString()
    });
  }
};

exports.getImmigrationData = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    logInfo('Get data request received');
    
    const clientApiKey = req.headers['x-api-key'];
    if (!validateApiKey(clientApiKey)) {
      logWarn('Unauthorized access attempt');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    const cached = getCachedData();
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        source: 'cache',
        itemCount: cached.length,
        timestamp: new Date().toISOString()
      });
    }

    await initializeClients();
    
    if (initError) {
      throw initError;
    }

    const firestoreDb = getFirestoreClient();
    
    const docSnapshot = await Promise.race([
      firestoreDb.collection(COLLECTION_NAME).doc(DOCUMENT_ID).get(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore read timeout')), FIRESTORE_TIMEOUT)
      )
    ]);
    
    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      const items = data.data || [];
      
      if (Array.isArray(items)) {
        setCachedData(items);
      }
      
      res.status(200).json({
        success: true,
        data: items,
        source: 'firestore',
        itemCount: items.length,
        fetchedAt: data.timestamp,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(200).json({
        success: true,
        data: [],
        source: 'empty',
        itemCount: 0,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logError('Get data request failed', error);
    res.status(500).json({
      success: false,
      error: 'Data retrieval failed',
      timestamp: new Date().toISOString()
    });
  }
};

exports.health = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    await initializeClients();
    
    const isHealthy = !initError && db !== null;
    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      cache: {
        hasData: !!cachedData,
        isValid: isCacheValid()
      }
    });
  } catch (error) {
    logError('Health check failed', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
};
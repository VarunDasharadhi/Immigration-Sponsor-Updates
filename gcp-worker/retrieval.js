// index.js - Worker and Retrieval Functions Combined (using Express for 2nd Gen Cloud Functions)

const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Firestore } = require('@google-cloud/firestore');
const express = require('express');

// --- Initialization ---
const app = express();
// NOTE: Make sure the service account running this function has access to the secret!
const secretManagerClient = new SecretManagerServiceClient(); 
const db = new Firestore();

// --- Configuration ---
const COLLECTION_NAME = 'dashboard';
const DOCUMENT_ID = 'latest_immigration_log';
const PORT = process.env.PORT || 8080;

// --- Helper: Securely Get API Key ---
async function getGeminiApiKey() {
    // Replace 'GCP_PROJECT' with the actual environment variable name if needed, 
    // but the gcloud environment usually populates it automatically.
    const name = `projects/${process.env.GCP_PROJECT}/secrets/GEMINI_API_KEY/versions/latest`;
    
    try {
        const [version] = await secretManagerClient.accessSecretVersion({ name });
        return version.payload.data.toString();
    } catch (e) {
        console.error("CRITICAL: Failed to access API Key from Secret Manager. Ensure key is set and IAM permissions are correct.");
        throw e;
    }
}

// =========================================================================
// 1. WORKER FUNCTION LOGIC (The expensive job run once daily)
//    Entry Point: refreshImmigrationData
// =========================================================================

/**
 * Executes the exhaustive search, calls Gemini, and writes results to Firestore.
 */
async function refreshImmigrationDataLogic(req, res) {
    console.log("Starting daily data refresh...");
    
    try {
        // 1. SECURELY GET API KEY
        const apiKey = await getGeminiApiKey();
        const ai = new GoogleGenAI({ apiKey });

        // 2. DEFINE THE GEMINI PROMPT 
        // NOTE: PASTE YOUR FULL, EXHAUSTIVE PROMPT HERE
        const PROMPT = `
        ---
        ROLE: Legislative Compliance Auditor & Policy Historian
        MANDATE: Conduct an exhaustive, chronological audit of all UK Immigration rule changes since 2023.
        OUTPUT FORMAT: Must be a single JSON array of objects.
        { 
            "policyDate": "YYYY-MM-DD", 
            "title": "Short title of the change",
            "summary": "Detailed, paragraph summary of who is affected, what the change is, and the effective date.",
            "sourceLink": "URL to the official UK government source (Gov.uk)."
        }
        Execute the search and analysis based on the full legislative history and future stages...
        `;

        // 3. CALL GEMINI API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: PROMPT,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // 4. PARSE THE RESULT
        let data = response.text.trim();
        // Clean up markdown fences
        data = data.replace(/```json/g, '').replace(/```/g, '').trim(); 
        const parsedData = JSON.parse(data);

        // 5. WRITE TO FIRESTORE
        const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
        await docRef.set({
            timestamp: new Date().toISOString(),
            status: 'Success',
            data: parsedData,
            sourceCount: parsedData.length
        });

        console.log("Data refresh successful. New document written to Firestore.");
        res.status(200).send("Data refresh complete.");
        
    } catch (error) {
        console.error("CRITICAL ERROR during data refresh:", error);
        
        // Write an error state for monitoring
        await db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
            timestamp: new Date().toISOString(),
            status: 'Failed',
            error: error.message || 'Unknown error'
        });
        
        res.status(500).send(`Data refresh failed: ${error.message}`);
    }
}


// =========================================================================
// 2. RETRIEVAL FUNCTION LOGIC (The fast, cheap job run per user request)
//    Entry Point: getDashboardData
// =========================================================================

/**
 * Reads the pre-computed data from Firestore and returns it instantly.
 */
async function getDashboardDataHandler(req, res) {
    // Set CORS headers for the frontend (REQUIRED for cross-domain calls)
    res.set('Access-Control-Allow-Origin', '*'); 

    // Handle preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      return res.status(204).send('');
    }

    try {
        const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
        const doc = await docRef.get();

        if (!doc.exists || !doc.data().data) {
            // Return 503 if the midnight job hasn't run yet or data is missing
            return res.status(503).json({ error: "Data is currently unavailable. Please check back after the midnight update." });
        }

        // Return the clean, pre-computed data array
        res.status(200).json(doc.data().data); 

    } catch (error) {
        console.error("Error retrieving data:", error);
        res.status(500).send({ error: "Server error while fetching data." });
    }
}


// =========================================================================
// 3. EXPRESS ROUTING AND SERVER STARTUP (Required for 2nd Gen Health Checks)
// =========================================================================

// *** THE CRITICAL FIX ***
// When a Cloud Function URL is accessed, the path hitting the Express app is the root '/'.
// We map the incoming request path to the appropriate entry point function.

// Map incoming requests for the 'refreshImmigrationData' service to its logic
app.get('/refreshImmigrationData', refreshImmigrationDataLogic); 

// Map incoming requests for the 'getDashboardData' service to its logic
app.get('/getDashboardData', getDashboardDataHandler); 

// Fallback to the root path for services where the function name is omitted in the URL
app.get('/', (req, res) => {
    // Check the host header to determine which function was called
    const host = req.headers.host;
    if (host.includes('refreshimmigrationdata')) {
        return refreshImmigrationDataLogic(req, res);
    } else if (host.includes('getdashboarddata')) {
        return getDashboardDataHandler(req, res);
    }
    res.status(404).send('Service Not Found');
});


// 4. Start the HTTP server and listen on the required port (8080)
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
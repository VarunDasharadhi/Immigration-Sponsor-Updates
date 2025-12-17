// index.js - The final, secure, and automated Cloud Functions V2 script

const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Firestore } = require('@google-cloud/firestore');

// --- Global Configuration ---
const PROJECT_ID = 'gen-lang-client-0461004021';
const COLLECTION_NAME = 'dashboard';
const DOCUMENT_ID = 'latest_immigration_log';

// IMPORTANT: REPLACE THIS WITH YOUR ACTUAL GENERATED FRONTEND API KEY
// This is used for simple authentication of your dashboard.
const EXPECTED_FRONTEND_API_KEY = process.env.FRONTEND_API_KEY;
const API_KEY_HEADER = 'x-api-key'; // Standard HTTP header name

// --- Initialization (Lazy Initialization) ---
let secretManagerClient = null; 
let db = null; 

// --- Helper: Securely Get GEMINI API Key (From Secret Manager) ---
async function getGeminiApiKey() {
    
    // This code ensures the key is never hardcoded.
    if (!secretManagerClient) {
        secretManagerClient = new SecretManagerServiceClient();
    }
    // Assumes your secret is named GEMINI_API_KEY
    const name = `projects/${PROJECT_ID}/secrets/GEMINI_API_KEY/versions/latest`;
    
    try {
        const [version] = await secretManagerClient.accessSecretVersion({ name });
        // The key is returned as a string from the Secret Manager
        return version.payload.data.toString().trim(); 
    } catch (e) {
        console.error("CRITICAL: Failed to access GEMINI API Key from Secret Manager.", e);
        throw new Error("Secret Manager Access Failed: Check function permissions to access Secret Manager.");
    }
}

// =========================================================================
// 1. WORKER FUNCTION (Entry Point: refreshImmigrationData)
//    - Secured via IAM/Cloud Scheduler
//    - Uses Secret Manager for Gemini API Key
// =========================================================================

exports.refreshImmigrationData = async (req, res) => {
    
    if (!db) {
        try {
            db = new Firestore({ projectId: PROJECT_ID }); 
        } catch (e) {
            console.error("CRITICAL ERROR: Failed to initialize Firestore client!", e);
            return res.status(500).send("Firestore initialization failed."); 
        }
    }

    console.log("Starting daily data refresh...");
    
    try {
        const apiKey = await getGeminiApiKey();
        const ai = new GoogleGenAI({ apiKey }); 

        // 2. DEFINE THE GEMINI PROMPT 
        const PROMPT = [
            'ROLE: Legislative Compliance Auditor & Policy Historian.',
            'MANDATE: Conduct an exhaustive, chronological audit of all UK Immigration rule changes since 2023.',
            // [PASTE YOUR FULL, EXHAUSTIVE PROMPT CONTENT HERE AS SEPARATE STRING LINES]
            'CRITICAL INSTRUCTION: Your entire response MUST be a single JSON array of objects. DO NOT include any text, dialogue, or markdown fences. The final output must be ONLY a parsable JSON array of objects.'
        ].join('\n');


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

        console.log("Data refresh successful.");
        res.status(200).send("Data refresh complete.");
        
    } catch (error) {
        console.error("CRITICAL ERROR during data refresh (Stack Trace):", error);
        
        if (db) {
            await db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
                timestamp: new Date().toISOString(),
                status: 'Failed',
                error: error.message || 'Unknown error during execution'
            });
        }
        
        res.status(500).send(`Data refresh failed: ${error.message}`);
    }
};

// =========================================================================
// 2. API ENDPOINT (Entry Point: getImmigrationData)
//    - Secured by requiring a custom API key in the request header
// =========================================================================

exports.getImmigrationData = async (req, res) => {
    
    // Set CORS headers for security and access (CRITICAL for frontend access)
    res.set('Access-Control-Allow-Origin', '*'); 

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', API_KEY_HEADER); // Must include the custom header!
        res.status(204).send('');
        return;
    }

    // 1. FRONTEND API KEY VALIDATION
    const clientApiKey = req.headers[API_KEY_HEADER];
    
    if (!clientApiKey || clientApiKey !== EXPECTED_FRONTEND_API_KEY) {
        console.warn(`Unauthorized access attempt. Key used: ${clientApiKey}`);
        // Return 401 Unauthorized for missing/incorrect key
        return res.status(401).json({ error: "Unauthorized: Missing or invalid API Key." });
    }

    // --- LAZY FIRESTORE INITIALIZATION ---
    if (!db) {
        try {
            db = new Firestore({ projectId: PROJECT_ID }); 
        } catch (e) {
            console.error("ERROR: Failed to initialize Firestore client for read.", e);
            return res.status(500).json({ error: "Database initialization failed." }); 
        }
    }
    // --- END LAZY INITIALIZATION ---

    try {
        const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
        const docSnapshot = await docRef.get(); 

        if (!docSnapshot.exists) {
            return res.status(404).json({ error: "Data document not found. Worker function has not run yet." });
        }

        const data = docSnapshot.data();
        
        console.log("Data successfully retrieved for dashboard.");
        res.status(200).json(data);

    } catch (error) {
        console.error("ERROR reading data from Firestore:", error);
        res.status(500).json({ error: `Failed to retrieve data: ${error.message}` });
    }
};
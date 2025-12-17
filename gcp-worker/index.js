// index.js - Updated with December 2025 Model and Exhaustive Prompt
const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Firestore } = require('@google-cloud/firestore');

const PROJECT_ID = 'gen-lang-client-0461004021';
const COLLECTION_NAME = 'dashboard';
const DOCUMENT_ID = 'latest_immigration_log';
const EXPECTED_FRONTEND_API_KEY = process.env.FRONTEND_API_KEY;

let secretManagerClient = null; 
let db = null; 

async function getGeminiApiKey() {
    if (!secretManagerClient) secretManagerClient = new SecretManagerServiceClient();
    const name = `projects/${PROJECT_ID}/secrets/GEMINI_API_KEY/versions/latest`;
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    return version.payload.data.toString().trim(); 
}

exports.refreshImmigrationData = async (req, res) => {
    if (!db) db = new Firestore({ projectId: PROJECT_ID });

    try {
        const apiKey = await getGeminiApiKey();
        const ai = new GoogleGenAI({ apiKey }); 

        // EXHAUSTIVE PROMPT: Tailored for late 2025 immigration landscape
        const PROMPT = `
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

        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash", // UPDATED: Latest December 2025 Model
            contents: PROMPT,
            config: { tools: [{ googleSearch: {} }] } // Enables real-time web search
        });

        let rawData = response.text.trim().replace(/```json/g, '').replace(/```/g, '').trim(); 
        const parsedData = JSON.parse(rawData);

        await db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).set({
            timestamp: new Date().toISOString(),
            status: 'Success',
            data: parsedData
        });

        res.status(200).send("Audit successful. Data pushed to Firestore.");
    } catch (error) {
        console.error("Refresh Error:", error);
        res.status(500).send(error.message);
    }
};

exports.getImmigrationData = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*'); 
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
        return res.status(204).send('');
    }

    const clientApiKey = req.headers['x-api-key'];
    if (!clientApiKey || clientApiKey !== EXPECTED_FRONTEND_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!db) db = new Firestore({ projectId: PROJECT_ID });

    try {
        const docSnapshot = await db.collection(COLLECTION_NAME).doc(DOCUMENT_ID).get(); 
        res.status(200).json(docSnapshot.exists ? docSnapshot.data() : { data: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
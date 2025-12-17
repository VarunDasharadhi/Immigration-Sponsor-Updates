// server.js (UPDATED TO INCLUDE API PROXY ROUTES)

const express = require('express');
const path = require('path');
const { fileURLToPath } = require('url')

// --- IMPORT SECURE GEMINI FUNCTIONS ---
// Note: Ensure this path is correct relative to your server.js file.
import {
    fetchLatestUpdates,
    fetchPetitions,
    simplifyLegalText,
    checkSponsorStatus,
    fetchSponsorNews
} from './services/geminiService.ts'; 

// --- ABSOLUTE PATH SETUP FOR ES MODULES (CRITICAL) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, 'dist');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware for parsing request bodies (needed for POST requests like simplify)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================================================
// 1. API ROUTES (Must come BEFORE static file serving)
// ===================================================

// Route 1: Fetch Latest Updates
app.get('/api/updates', async (req, res) => {
    try {
        const updates = await fetchLatestUpdates();
        res.json(updates);
    } catch (error) {
        console.error("API Error - /api/updates:", error);
        res.status(500).send({ message: "Failed to fetch updates from Gemini service." });
    }
});

// Route 2: Fetch Petitions
app.get('/api/petitions', async (req, res) => {
    try {
        const petitions = await fetchPetitions();
        res.json(petitions);
    } catch (error) {
        console.error("API Error - /api/petitions:", error);
        res.status(500).send({ message: "Failed to fetch petitions from Gemini service." });
    }
});

// Route 3: Simplify Legal Text
app.post('/api/simplify', async (req, res) => {
    const { complexText } = req.body;
    if (!complexText) {
        return res.status(400).send({ message: "Missing complexText in request body." });
    }
    try {
        const simplified = await simplifyLegalText(complexText);
        res.send(simplified);
    } catch (error) {
        console.error("API Error - /api/simplify:", error);
        res.status(500).send({ message: "Failed to simplify text via Gemini service." });
    }
});

// Route 4: Check Sponsor Status (using query parameter)
app.get('/api/sponsor-status', async (req, res) => {
    const { companyName } = req.query;
    if (!companyName) {
        return res.status(400).send({ message: "Missing companyName query parameter." });
    }
    try {
        const status = await checkSponsorStatus(companyName);
        res.json(status);
    } catch (error) {
        console.error("API Error - /api/sponsor-status:", error);
        res.status(500).send({ message: "Failed to check sponsor status via Gemini service." });
    }
});

// Route 5: Fetch Sponsor News
app.get('/api/sponsor-news', async (req, res) => {
    try {
        const news = await fetchSponsorNews();
        res.json(news);
    } catch (error) {
        console.error("API Error - /api/sponsor-news:", error);
        res.status(500).send({ message: "Failed to fetch sponsor news from Gemini service." });
    }
});


// ===================================================
// 2. STATIC FILE SERVING (Must come AFTER API Routes)
// ===================================================

// Serve Static Files
app.use(express.static(distPath));

// Client-Side Routing Fallback (Must be the LAST route)
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// 3. Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

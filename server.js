// server.js
// Express server: serves the built SPA and proxies all /api/* calls to the
// server-side AI service so API keys never reach the browser.

// Load env from .env.local then .env (Node 24+ built-in, no dotenv dependency)
for (const file of ['.env.local', '.env']) {
  try { process.loadEnvFile(file); } catch { /* file absent — fine */ }
}

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import * as aiService from './services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, 'dist');

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// ─── middleware ──────────────────────────────────────────────────────────────

app.use(compression());
app.use(express.json());

// Permissive CORS so the Vite dev server (:3000) can call the API server (:10000)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    hasApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    env: NODE_ENV,
    ts: new Date().toISOString(),
  });
});

app.get('/api/updates', async (_req, res) => {
  try {
    const data = await aiService.getUpdates();
    res.json(data);
  } catch (err) {
    console.error('[/api/updates]', err);
    res.status(500).json({ error: 'Something went wrong fetching updates.' });
  }
});

app.get('/api/petitions', async (_req, res) => {
  try {
    const data = await aiService.getPetitions();
    res.json(data);
  } catch (err) {
    console.error('[/api/petitions]', err);
    res.status(500).json({ error: 'Something went wrong fetching petitions.' });
  }
});

app.post('/api/simplify', async (req, res) => {
  const { complexText } = req.body || {};
  if (!complexText?.trim()) {
    return res.status(400).json({ error: 'complexText is required' });
  }
  try {
    const data = await aiService.simplify(complexText);
    res.json(data);
  } catch (err) {
    console.error('[/api/simplify]', err);
    res.status(500).json({ error: 'Something went wrong simplifying the text.' });
  }
});

app.get('/api/sponsor-status', async (req, res) => {
  const companyName = String(req.query.companyName || '').trim();
  if (!companyName) {
    return res.status(400).json({ error: 'companyName query param is required' });
  }
  try {
    const data = await aiService.checkSponsor(companyName);
    res.json(data);
  } catch (err) {
    console.error('[/api/sponsor-status]', err);
    res.status(500).json({ error: 'Something went wrong checking sponsor status.' });
  }
});

app.get('/api/sponsor-news', async (_req, res) => {
  try {
    const data = await aiService.getSponsorNews();
    res.json(data);
  } catch (err) {
    console.error('[/api/sponsor-news]', err);
    res.status(500).json({ error: 'Something went wrong fetching sponsor news.' });
  }
});

// ─── static SPA ──────────────────────────────────────────────────────────────

app.use(express.static(distPath, {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: false,
}));

// SPA fallback for client-side tab navigation
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API key configured: ${Boolean(process.env.OPENROUTER_API_KEY)}`);
  // Load disk cache and kick off background warm-up + daily midnight refresh
  aiService.initCache();
});

export default app;

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as aiService from '../services/aiService.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const companyName = String(req.query.companyName || '').trim();
  if (!companyName) {
    return res.status(400).json({ error: 'companyName query param is required' });
  }
  try {
    const data = await aiService.checkSponsor(companyName);
    // Cache per-company results for 1h
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (err) {
    console.error('[/api/sponsor-status]', err);
    res.status(500).json({ error: 'Something went wrong checking sponsor status.' });
  }
}

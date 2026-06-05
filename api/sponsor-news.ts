import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as aiService from '../services/aiService.js';

export const config = { maxDuration: 60 };

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await aiService.getSponsorNews();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (err) {
    console.error('[/api/sponsor-news]', err);
    res.status(500).json({ error: 'Something went wrong fetching sponsor news.' });
  }
}

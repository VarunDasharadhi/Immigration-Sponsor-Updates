import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as aiService from '../services/aiService.js';

// Allow up to 60s for the AI call; Vercel Pro required for > 10s
export const config = { maxDuration: 60 };

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await aiService.getUpdates();
    // CDN caches for 24h; serves stale while revalidating for 7d
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (err) {
    console.error('[/api/updates]', err);
    res.status(500).json({ error: 'Something went wrong fetching updates.' });
  }
}

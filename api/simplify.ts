import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as aiService from '../services/aiService.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { complexText } = (req.body as { complexText?: string }) || {};
  if (!complexText?.trim()) {
    return res.status(400).json({ error: 'complexText is required' });
  }
  try {
    const data = await aiService.simplify(complexText);
    res.status(200).json(data);
  } catch (err) {
    console.error('[/api/simplify]', err);
    res.status(500).json({ error: 'Something went wrong simplifying the text.' });
  }
}

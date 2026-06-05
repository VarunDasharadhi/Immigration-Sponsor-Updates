import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    hasApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    env: process.env.NODE_ENV || 'production',
    ts: new Date().toISOString(),
  });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refreshUpdates, refreshPetitions, refreshSponsorNews } from '../../services/aiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await Promise.all([refreshUpdates(), refreshPetitions(), refreshSponsorNews()]);
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[Cron] Refresh failed:', err);
    res.status(500).json({ error: 'Refresh failed', detail: String(err) });
  }
}

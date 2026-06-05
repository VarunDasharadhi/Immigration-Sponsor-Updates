/**
 * cache.ts
 * Disk-backed in-memory cache for feed data.
 * Persists to .cache/feeds.json so data survives server restarts.
 * Never expires on its own — callers decide when to refresh.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel's filesystem is read-only except /tmp; use that in serverless environments
const CACHE_DIR = process.env.VERCEL
  ? '/tmp/.cache'
  : path.resolve(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'feeds.json');

interface CacheEntry {
  data: any;
  savedAt: number;
}

const store = new Map<string, CacheEntry>();

export function load(): void {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed: Record<string, CacheEntry> = JSON.parse(raw);
    for (const [key, entry] of Object.entries(parsed)) {
      store.set(key, entry);
    }
    console.log(`[Cache] Loaded ${store.size} entries from disk`);
  } catch {
    // File absent or corrupt — start empty
    console.log('[Cache] No disk cache found, starting fresh');
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of store.entries()) {
      obj[key] = entry;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[Cache] Failed to persist to disk:', err);
  }
}

export function get(key: string): any | undefined {
  return store.get(key)?.data;
}

export function has(key: string): boolean {
  return store.has(key);
}

export function set(key: string, data: any): void {
  store.set(key, { data, savedAt: Date.now() });
  persist();
}

export function ageMs(key: string): number {
  const entry = store.get(key);
  if (!entry) return Infinity;
  return Date.now() - entry.savedAt;
}

/**
 * cache.ts
 * In-memory cache for feed data with two persistence backends:
 * - Local / Render: disk file at .cache/feeds.json
 * - Vercel: Upstash Redis (shared across all function instances)
 *   Env vars set automatically by the Vercel Upstash marketplace integration:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from '@upstash/redis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel's filesystem is read-only except /tmp; use that in serverless environments
const CACHE_DIR = process.env.VERCEL
  ? '/tmp/.cache'
  : path.resolve(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'feeds.json');

// True when KV env vars are present (set by Vercel Upstash marketplace integration)
const isRedis = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const redis = isRedis
  ? new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  : null;

interface CacheEntry {
  data: any;
  savedAt: number;
}

const store = new Map<string, CacheEntry>();

export function load(): void {
  if (isRedis) return; // Redis handles persistence on Vercel; no disk to read
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

export async function get(key: string): Promise<any | undefined> {
  const entry = store.get(key);
  if (entry) return entry.data;

  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (raw) {
        const parsed: CacheEntry = typeof raw === 'string' ? JSON.parse(raw) : raw as CacheEntry;
        store.set(key, parsed);
        console.log(`[Cache] Redis hit: ${key}`);
        return parsed.data;
      }
    } catch (err) {
      console.error('[Cache] Redis get failed:', err);
    }
  }
  return undefined;
}

export function has(key: string): boolean {
  return store.has(key);
}

export async function set(key: string, data: any): Promise<void> {
  const entry: CacheEntry = { data, savedAt: Date.now() };
  store.set(key, entry);
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(entry));
    } catch (err) {
      console.error('[Cache] Redis set failed:', err);
    }
  } else {
    persist();
  }
}

export function ageMs(key: string): number {
  const entry = store.get(key);
  if (!entry) return Infinity;
  return Date.now() - entry.savedAt;
}

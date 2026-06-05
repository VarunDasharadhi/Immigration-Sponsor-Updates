// API Client Service - Calls backend endpoints from frontend
import { AIResponse, SponsorCheckResult, SponsorNewsItem } from '../types';

// In the browser, use Vite's import.meta.env (not process.env which crashes at runtime).
// In Node (server-side imports if ever needed), fall back to process.env.
// Use relative URLs so the same build works on Vercel, Cloud Run, and local npm start.
// For local Vite dev server (different port), set VITE_API_URL=http://localhost:10000
const API_BASE_URL = typeof window !== 'undefined'
  ? (import.meta.env?.VITE_API_URL || '')
  : (process.env.API_URL || '');

// Response cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ApiError {
  message: string;
  status?: number;
  endpoint?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check cache and return if valid
   */
  private getFromCache(key: string): any | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Cache HIT] ${key}`);
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  /**
   * Store in cache
   */
  private setCache(key: string, data: any): void {
    cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Generic fetch with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit,
    cacheKey?: string
  ): Promise<T> {
    // Check cache first
    if (cacheKey && options?.method !== 'POST') {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached as T;
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw {
          message: `API Error: ${response.status} ${response.statusText}`,
          status: response.status,
          endpoint,
        } as ApiError;
      }

      const json = await response.json();
      
      // Unwrap server response format { success, data, timestamp }
      const data = json.data || json;
      console.log(`[API] ${endpoint} - raw response:`, json, 'unwrapped:', data);

      // Cache successful GET requests
      if (cacheKey && options?.method !== 'POST') {
        this.setCache(cacheKey, data);
      }

      return data as T;
    } catch (error: any) {
      console.error(`[API ERROR] ${endpoint}:`, error);
      throw {
        message: error?.message || 'Network error. Please try again.',
        status: error?.status,
        endpoint,
      } as ApiError;
    }
  }

  /**
   * Fetch latest immigration updates
   */
  async fetchUpdates(): Promise<AIResponse> {
    return this.fetch<AIResponse>('/api/updates', { method: 'GET' }, 'updates');
  }

  /**
   * Fetch petitions
   */
  async fetchPetitions(): Promise<AIResponse> {
    return this.fetch<AIResponse>('/api/petitions', { method: 'GET' }, 'petitions');
  }

  /**
   * Simplify legal text
   */
  async simplifyText(complexText: string): Promise<{ simplified: string }> {
    return this.fetch<{ simplified: string }>('/api/simplify', {
      method: 'POST',
      body: JSON.stringify({ complexText }),
    });
  }

  /**
   * Check sponsor status
   */
  async checkSponsor(companyName: string): Promise<SponsorCheckResult> {
    return this.fetch<SponsorCheckResult>(
      `/api/sponsor-status?companyName=${encodeURIComponent(companyName)}`,
      { method: 'GET' },
      `sponsor:${companyName}`
    );
  }

  /**
   * Fetch sponsor news
   */
  async fetchSponsorNews(): Promise<SponsorNewsItem[]> {
    return this.fetch<SponsorNewsItem[]>('/api/sponsor-news', { method: 'GET' }, 'sponsor-news');
  }

  /**
   * Health check
   */
  async health() {
    try {
      return await this.fetch('/api/health', { method: 'GET' });
    } catch {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Clear cache (useful for manual refresh)
   */
  clearCache(key?: string) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }
}

export const apiClient = new ApiClient();

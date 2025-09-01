/**
 * Cache utility for storing API responses with TTL (Time To Live)
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

  /**
   * Set an item in the cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get an item from the cache if it's still valid
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      // Item has expired, remove it
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if an item exists and is still valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove an item from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache info for a specific key
   */
  getCacheInfo(key: string): { exists: boolean; age?: number; ttl?: number; expiresIn?: number } {
    const item = this.cache.get(key);
    if (!item) return { exists: false };

    const now = Date.now();
    const age = now - item.timestamp;
    const expiresIn = item.ttl - age;

    return {
      exists: true,
      age,
      ttl: item.ttl,
      expiresIn: Math.max(0, expiresIn)
    };
  }

  /**
   * Get an item from the cache regardless of expiration (for fallback purposes)
   */
  getExpired<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    return item.data as T;
  }

  /**
   * Force refresh a cached item by removing it
   */
  invalidate(key: string): void {
    this.delete(key);
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Cache key generators
export const cacheKeys = {
  driver: (custId: string | number) => `driver:${custId}`,
  raceResult: (raceId: string | number) => `race:${raceId}`,
  lapTimes: (raceId: string | number, driverId: string | number) => `laps:${raceId}:${driverId}`,
  driverSearch: (query: string) => `search:${query.toLowerCase()}`,
  personalBests: (custId: string | number) => `personalBests:${custId}`,
};

// Cache TTL constants (in milliseconds)
export const cacheTTL = {
  DRIVER_PROFILE: 10 * 60 * 1000, // 10 minutes
  RACE_RESULT: 60 * 60 * 1000,    // 1 hour (race results don't change)
  LAP_TIMES: 60 * 60 * 1000,      // 1 hour (lap times don't change)
  SEARCH_RESULTS: 5 * 60 * 1000,  // 5 minutes
  PERSONAL_BESTS: Number(process.env.PERSONAL_BESTS_CACHE_TTL) || 60 * 60 * 1000, // default 1 hour
};

// Utility functions
export function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / (1000 * 60));
  const seconds = Math.floor((ageMs % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s ago`;
  }
  return `${seconds}s ago`;
}

export function formatTimeUntilExpiry(expiresInMs: number): string {
  const minutes = Math.floor(expiresInMs / (1000 * 60));
  const seconds = Math.floor((expiresInMs % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

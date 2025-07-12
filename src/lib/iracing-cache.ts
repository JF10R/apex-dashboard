/**
 * Centralized Caching Utilities for iRacing API
 * 
 * Provides a unified caching system for all API responses to improve
 * performance and reduce API calls.
 */

export interface CacheEntry<T> {
  data: T;
  expiry: number;
  timestamp: number;
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  totalSize: string; // Human readable size
  hitRate?: number;
  oldestEntry?: string;
  newestEntry?: string;
}

/**
 * Generic cache class with TTL support
 */
export class TtlCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private hitCount = 0;
  private missCount = 0;

  constructor(
    private defaultTtl: number,
    private maxSize: number = 1000
  ) {}

  set(key: string, value: T, ttl?: number): void {
    const expiryTtl = ttl ?? this.defaultTtl;
    const now = Date.now();
    
    // Clean up if we're at max size
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data: value,
      expiry: now + expiryTtl,
      timestamp: now
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): CacheStats & { hitRate: number } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    const validEntries = entries.filter(([, entry]) => now <= entry.expiry);
    
    const timestamps = validEntries.map(([, entry]) => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? 
      new Date(Math.min(...timestamps)).toISOString() : undefined;
    const newestEntry = timestamps.length > 0 ? 
      new Date(Math.max(...timestamps)).toISOString() : undefined;

    return {
      totalEntries: this.cache.size,
      expiredEntries: this.cache.size - validEntries.length,
      totalSize: this.estimateSize(),
      hitRate,
      oldestEntry,
      newestEntry
    };
  }

  private estimateSize(): string {
    const sizeBytes = JSON.stringify(Array.from(this.cache.entries())).length * 2; // Rough estimate
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Pre-configured cache instances for different data types
export const caches = {
  // Short-lived caches (5 minutes)
  memberStats: new TtlCache<any>(5 * 60 * 1000, 100),
  chartData: new TtlCache<any>(5 * 60 * 1000, 200),
  
  // Medium-lived caches (1 hour)
  memberData: new TtlCache<any>(60 * 60 * 1000, 100),
  memberProfiles: new TtlCache<any>(60 * 60 * 1000, 100),
  raceResults: new TtlCache<any>(60 * 60 * 1000, 500),
  
  // Long-lived caches (24 hours)
  cars: new TtlCache<any>(24 * 60 * 60 * 1000, 50),
  
  // Very long-lived caches (7 days)
  constants: new TtlCache<any>(7 * 24 * 60 * 60 * 1000, 50),
  lookup: new TtlCache<any>(7 * 24 * 60 * 60 * 1000, 100),
};

/**
 * Get a cached value or compute it if not cached
 */
export async function getCached<T>(
  cache: TtlCache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  cache.set(key, value, ttl);
  return value;
}

/**
 * Get comprehensive cache statistics
 */
export function getAllCacheStats(): Record<string, CacheStats & { hitRate: number }> {
  return Object.fromEntries(
    Object.entries(caches).map(([name, cache]) => [name, cache.getStats()])
  );
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  Object.values(caches).forEach(cache => cache.clear());
}

/**
 * Cleanup expired entries from all caches
 */
export function cleanupAllCaches(): void {
  Object.values(caches).forEach(cache => cache.cleanup());
}

// Auto-cleanup every 15 minutes
setInterval(cleanupAllCaches, 15 * 60 * 1000);

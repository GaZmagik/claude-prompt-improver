/**
 * LRU cache for dynamic discovery with mtime-based invalidation
 * Used to cache discovered agents, commands, skills, and output styles
 */

/** Maximum number of entries in the cache */
export const MAX_CACHE_SIZE = 50;

/**
 * Cache entry storing items with mtime for validation
 */
export interface CacheEntry<T> {
  readonly items: T;
  readonly mtime: number;
  lastAccessed: number;
}

/**
 * LRU cache interface for discovery results
 */
export interface DiscoveryCache<T> {
  /** Get cached items if mtime matches, null otherwise */
  get(key: string, currentMtime: number): T | null;
  /** Store items with mtime */
  set(key: string, items: T, mtime: number): void;
  /** Get raw entry (for testing) */
  getEntry(key: string): CacheEntry<T> | null;
  /** Remove specific entry */
  invalidate(key: string): void;
  /** Remove all entries */
  clear(): void;
  /** Get current cache size */
  size(): number;
}

/**
 * Creates an LRU cache for discovery results
 * @returns A new discovery cache instance
 */
export function createDiscoveryCache<T>(): DiscoveryCache<T> {
  const cache = new Map<string, CacheEntry<T>>();
  // Monotonic counter for LRU ordering (Date.now() may not change between rapid operations)
  let accessCounter = 0;

  /**
   * Evicts the least recently used entry if cache is at capacity
   */
  function evictLRU(): void {
    if (cache.size < MAX_CACHE_SIZE) {
      return;
    }

    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== null) {
      cache.delete(lruKey);
    }
  }

  return {
    get(key: string, currentMtime: number): T | null {
      const entry = cache.get(key);
      if (!entry) {
        return null;
      }

      // Invalidate if mtime differs
      if (entry.mtime !== currentMtime) {
        cache.delete(key);
        return null;
      }

      // Update last accessed time with monotonic counter
      entry.lastAccessed = ++accessCounter;
      return entry.items;
    },

    set(key: string, items: T, mtime: number): void {
      // Evict LRU if at capacity (before adding new entry)
      if (!cache.has(key)) {
        evictLRU();
      }

      cache.set(key, {
        items,
        mtime,
        lastAccessed: ++accessCounter,
      });
    },

    getEntry(key: string): CacheEntry<T> | null {
      return cache.get(key) ?? null;
    },

    invalidate(key: string): void {
      cache.delete(key);
    },

    clear(): void {
      cache.clear();
    },

    size(): number {
      return cache.size;
    },
  };
}

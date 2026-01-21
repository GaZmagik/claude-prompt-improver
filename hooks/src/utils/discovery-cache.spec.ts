/**
 * Tests for discovery-cache utility
 * TDD: Write tests first, verify they fail, then implement
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  createDiscoveryCache,
  type DiscoveryCache,
  MAX_CACHE_SIZE,
} from './discovery-cache.ts';

describe('DiscoveryCache', () => {
  let cache: DiscoveryCache<string[]>;

  beforeEach(() => {
    cache = createDiscoveryCache<string[]>();
  });

  describe('cache creation', () => {
    it('should create cache with MAX_CACHE_SIZE=50', () => {
      expect(MAX_CACHE_SIZE).toBe(50);
    });

    it('should start with empty cache', () => {
      expect(cache.size()).toBe(0);
    });
  });

  describe('get()', () => {
    it('should return cached item when mtime matches', () => {
      const items = ['agent1.md', 'agent2.md'];
      const mtime = 1234567890;

      cache.set('/test/agents/', items, mtime);
      const result = cache.get('/test/agents/', mtime);

      expect(result).toEqual(items);
    });

    it('should return null when mtime differs (invalidation)', () => {
      const items = ['agent1.md'];
      const originalMtime = 1234567890;
      const newMtime = 1234567999;

      cache.set('/test/agents/', items, originalMtime);
      const result = cache.get('/test/agents/', newMtime);

      expect(result).toBeNull();
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('/nonexistent/', 12345);

      expect(result).toBeNull();
    });

    it('should update lastAccessed counter on hit', () => {
      const items = ['agent.md'];
      const mtime = 12345;

      cache.set('/test/', items, mtime);
      const entryBefore = cache.getEntry('/test/');
      const accessedBefore = entryBefore!.lastAccessed;

      // Access the cache
      cache.get('/test/', mtime);

      const entryAfter = cache.getEntry('/test/');
      expect(entryAfter).not.toBeNull();
      expect(entryAfter!.lastAccessed).toBeGreaterThan(accessedBefore);
    });
  });

  describe('set()', () => {
    it('should store item with mtime and lastAccessed', () => {
      const items = ['file.md'];
      const mtime = 98765;

      cache.set('/path/', items, mtime);

      const entry = cache.getEntry('/path/');
      expect(entry).not.toBeNull();
      expect(entry!.items).toEqual(items);
      expect(entry!.mtime).toBe(mtime);
      expect(entry!.lastAccessed).toBeDefined();
      expect(typeof entry!.lastAccessed).toBe('number');
    });

    it('should overwrite existing entry for same key', () => {
      cache.set('/path/', ['old.md'], 100);
      cache.set('/path/', ['new.md'], 200);

      const entry = cache.getEntry('/path/');
      expect(entry!.items).toEqual(['new.md']);
      expect(entry!.mtime).toBe(200);
    });
  });

  describe('LRU eviction', () => {
    it('should evict LRU entry when size exceeds MAX_CACHE_SIZE', () => {
      // Fill cache to max
      for (let i = 0; i < MAX_CACHE_SIZE; i++) {
        cache.set(`/path${i}/`, [`file${i}.md`], i);
      }

      expect(cache.size()).toBe(MAX_CACHE_SIZE);

      // Access an early entry to make it recently used
      cache.get('/path0/', 0);

      // Add one more entry, should evict the LRU (not path0, since we accessed it)
      cache.set('/newpath/', ['new.md'], 999);

      expect(cache.size()).toBe(MAX_CACHE_SIZE);
      // path0 should still exist (was accessed)
      expect(cache.get('/path0/', 0)).not.toBeNull();
      // path1 should be evicted (was LRU)
      expect(cache.get('/path1/', 1)).toBeNull();
    });

    it('should not evict when under MAX_CACHE_SIZE', () => {
      cache.set('/path1/', ['a.md'], 1);
      cache.set('/path2/', ['b.md'], 2);
      cache.set('/path3/', ['c.md'], 3);

      expect(cache.size()).toBe(3);
      expect(cache.get('/path1/', 1)).toEqual(['a.md']);
      expect(cache.get('/path2/', 2)).toEqual(['b.md']);
      expect(cache.get('/path3/', 3)).toEqual(['c.md']);
    });
  });

  describe('invalidate()', () => {
    it('should remove specific entry', () => {
      cache.set('/path1/', ['a.md'], 1);
      cache.set('/path2/', ['b.md'], 2);

      cache.invalidate('/path1/');

      expect(cache.get('/path1/', 1)).toBeNull();
      expect(cache.get('/path2/', 2)).toEqual(['b.md']);
      expect(cache.size()).toBe(1);
    });

    it('should do nothing for non-existent key', () => {
      cache.set('/path/', ['a.md'], 1);

      cache.invalidate('/nonexistent/');

      expect(cache.size()).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      cache.set('/path1/', ['a.md'], 1);
      cache.set('/path2/', ['b.md'], 2);
      cache.set('/path3/', ['c.md'], 3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('/path1/', 1)).toBeNull();
      expect(cache.get('/path2/', 2)).toBeNull();
      expect(cache.get('/path3/', 3)).toBeNull();
    });
  });
});

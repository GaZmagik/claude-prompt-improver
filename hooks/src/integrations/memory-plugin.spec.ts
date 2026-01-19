/**
 * T110-T117: Memory plugin integration tests
 * T110: Test memory plugin detection at known installation paths
 * T111: Test memory plugin reads index.json
 * T112: Test memory plugin matches memories by title keywords
 * T113: Test memory plugin matches memories by tag keywords
 * T114: Test memory plugin limits to top 3-5 most relevant
 * T115: Test memory plugin gracefully skips if plugin not installed
 * T116: Test memory plugin gracefully skips on index.json parse error
 * T117: Test memory plugin gracefully skips if configuration.integrations.memory=false
 */
import { describe, expect, it } from 'bun:test';
import {
  type Memory,
  type MemoryContext,
  checkMemoryPluginInstalled,
  formatMemoryContext,
  gatherMemoryContext,
  matchMemoriesByTags,
  matchMemoriesByTitle,
  parseMemoryIndex,
} from './memory-plugin.ts';

describe('Memory Plugin Integration', () => {
  describe('T110: checkMemoryPluginInstalled - detects plugin at known paths', () => {
    it('should detect plugin at ~/.claude/plugins/cache/enhance/claude-memory-plugin/', () => {
      const result = checkMemoryPluginInstalled({
        _mockFileSystem: {
          '~/.claude/plugins/cache/enhance/claude-memory-plugin/': 'directory',
        },
      });

      expect(result.found).toBe(true);
      expect(result.path).toContain('claude-memory-plugin');
    });

    it('should detect plugin at project .claude/plugins/', () => {
      const result = checkMemoryPluginInstalled({
        _mockFileSystem: {
          '.claude/plugins/claude-memory-plugin/': 'directory',
        },
      });

      expect(result.found).toBe(true);
    });

    it('should detect plugin via .claude/memory/ directory', () => {
      const result = checkMemoryPluginInstalled({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': '{}',
        },
      });

      expect(result.found).toBe(true);
    });

    it('should return false when plugin not found', () => {
      const result = checkMemoryPluginInstalled({
        _mockFileSystem: {},
      });

      expect(result.found).toBe(false);
    });
  });

  describe('T111: parseMemoryIndex - reads index.json', () => {
    it('should parse index.json with memories array', () => {
      const indexContent = JSON.stringify({
        memories: [
          {
            id: 'mem-1',
            title: 'Decision about auth',
            type: 'decision',
            tags: ['auth', 'security'],
          },
          { id: 'mem-2', title: 'Learning about caching', type: 'learning', tags: ['performance'] },
        ],
      });

      const index = parseMemoryIndex(indexContent);

      expect(index.memories.length).toBe(2);
      expect(index.memories[0]?.id).toBe('mem-1');
    });

    it('should handle index with additional fields', () => {
      const indexContent = JSON.stringify({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        memories: [{ id: 'mem-1', title: 'Test memory', type: 'artifact', tags: [] }],
      });

      const index = parseMemoryIndex(indexContent);

      expect(index.memories.length).toBe(1);
    });

    it('should return empty memories for invalid JSON', () => {
      const index = parseMemoryIndex('not valid json');

      expect(index.memories.length).toBe(0);
    });

    it('should return empty memories for missing memories array', () => {
      const index = parseMemoryIndex('{}');

      expect(index.memories.length).toBe(0);
    });
  });

  describe('T112: matchMemoriesByTitle - matches by title keywords', () => {
    it('should match memories with title containing prompt keywords', () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'Authentication decision', type: 'decision', tags: [] },
        { id: 'mem-2', title: 'Database schema', type: 'artifact', tags: [] },
        { id: 'mem-3', title: 'Login flow design', type: 'decision', tags: [] },
      ];

      const matched = matchMemoriesByTitle(memories, 'fix authentication login');

      expect(matched.length).toBeGreaterThan(0);
      expect(matched.some((m) => m.id === 'mem-1')).toBe(true);
    });

    it('should return empty when no titles match', () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'Database migration', type: 'learning', tags: [] },
      ];

      const matched = matchMemoriesByTitle(memories, 'authentication user');

      expect(matched.length).toBe(0);
    });

    it('should be case insensitive', () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'AUTHENTICATION DECISION', type: 'decision', tags: [] },
      ];

      const matched = matchMemoriesByTitle(memories, 'authentication');

      expect(matched.length).toBe(1);
    });
  });

  describe('T113: matchMemoriesByTags - matches by tag keywords', () => {
    it('should match memories with tags containing prompt keywords', () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'Some decision', type: 'decision', tags: ['auth', 'security'] },
        { id: 'mem-2', title: 'Other decision', type: 'decision', tags: ['database'] },
      ];

      const matched = matchMemoriesByTags(memories, 'implement security feature');

      expect(matched.length).toBeGreaterThan(0);
      expect(matched.some((m) => m.id === 'mem-1')).toBe(true);
    });

    it('should return empty when no tags match', () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'Test', type: 'learning', tags: ['frontend', 'react'] },
      ];

      const matched = matchMemoriesByTags(memories, 'backend database');

      expect(matched.length).toBe(0);
    });

    it('should handle memories without tags', () => {
      const memories: Memory[] = [{ id: 'mem-1', title: 'Test', type: 'learning', tags: [] }];

      const matched = matchMemoriesByTags(memories, 'anything');

      expect(matched.length).toBe(0);
    });
  });

  describe('T114: gatherMemoryContext - limits to top 3-5 most relevant', () => {
    it('should limit results to 5 memories', async () => {
      const memories = Array.from({ length: 10 }, (_, i) => ({
        id: `mem-${i}`,
        title: `Auth decision ${i}`,
        type: 'decision' as const,
        tags: ['auth'],
      }));

      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': JSON.stringify({ memories }),
        },
        prompt: 'fix authentication issue',
      });

      expect(result.success).toBe(true);
      expect(result.context?.memories.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize by relevance score', async () => {
      const memories: Memory[] = [
        { id: 'mem-1', title: 'General note', type: 'learning', tags: [] },
        { id: 'mem-2', title: 'Auth login decision', type: 'decision', tags: ['auth', 'login'] },
        { id: 'mem-3', title: 'Database setup', type: 'artifact', tags: [] },
      ];

      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': JSON.stringify({ memories }),
        },
        prompt: 'fix auth login bug',
      });

      expect(result.success).toBe(true);
      expect(result.context?.memories[0]?.id).toBe('mem-2');
    });
  });

  describe('T115: gatherMemoryContext - skips if plugin not installed', () => {
    it('should skip when memory plugin not found', async () => {
      const result = await gatherMemoryContext({
        _mockFileSystem: {},
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('plugin_not_installed');
    });

    it('should return gracefully without error', async () => {
      const result = await gatherMemoryContext({
        _mockFileSystem: {},
      });

      expect(result.error).toBeUndefined();
    });
  });

  describe('T116: gatherMemoryContext - skips on index.json parse error', () => {
    it('should skip when index.json is invalid', async () => {
      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': 'invalid json content',
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('index_parse_error');
    });

    it('should skip when index.json is missing', async () => {
      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          // No index.json
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_index_file');
    });
  });

  describe('T117: gatherMemoryContext - skips if disabled', () => {
    it('should skip when enabled=false', async () => {
      const result = await gatherMemoryContext({
        enabled: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('disabled');
    });

    it('should not read any files when disabled', async () => {
      const result = await gatherMemoryContext({
        enabled: false,
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': '{"memories":[]}',
        },
      });

      expect(result.skipped).toBe(true);
      expect(result.context).toBeUndefined();
    });
  });

  describe('gatherMemoryContext - full integration', () => {
    it('should gather complete memory context', async () => {
      const memories: Memory[] = [
        {
          id: 'decision-auth',
          title: 'Auth approach decision',
          type: 'decision',
          tags: ['auth', 'security'],
        },
        {
          id: 'learning-jwt',
          title: 'JWT best practices',
          type: 'learning',
          tags: ['auth', 'jwt'],
        },
        { id: 'artifact-schema', title: 'Database schema', type: 'artifact', tags: ['database'] },
      ];

      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': JSON.stringify({ memories }),
        },
        prompt: 'implement authentication with JWT',
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.memories.length).toBeGreaterThan(0);
    });

    it('should handle empty memories gracefully', async () => {
      const result = await gatherMemoryContext({
        _mockFileSystem: {
          '.claude/memory/': 'directory',
          '.claude/memory/index.json': JSON.stringify({ memories: [] }),
        },
        prompt: 'some prompt',
      });

      expect(result.success).toBe(true);
      expect(result.context?.memories.length).toBe(0);
    });
  });

  describe('formatMemoryContext - formats for injection', () => {
    it('should format memory context as readable string', () => {
      const context: MemoryContext = {
        memories: [
          {
            id: 'decision-auth',
            title: 'Auth approach decision',
            type: 'decision',
            tags: ['auth'],
          },
          { id: 'learning-jwt', title: 'JWT best practices', type: 'learning', tags: ['jwt'] },
        ],
      };

      const formatted = formatMemoryContext(context);

      expect(formatted).toContain('Auth approach decision');
      expect(formatted).toContain('decision');
      expect(formatted).toContain('JWT best practices');
    });

    it('should include memory type in output', () => {
      const context: MemoryContext = {
        memories: [
          { id: 'mem-1', title: 'Test decision', type: 'decision', tags: [] },
          { id: 'mem-2', title: 'Test learning', type: 'learning', tags: [] },
        ],
      };

      const formatted = formatMemoryContext(context);

      expect(formatted).toContain('decision');
      expect(formatted).toContain('learning');
    });

    it('should handle empty context gracefully', () => {
      const context: MemoryContext = {
        memories: [],
      };

      const formatted = formatMemoryContext(context);

      expect(formatted).toBe('');
    });
  });
});

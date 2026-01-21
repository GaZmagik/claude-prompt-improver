/**
 * Tests for directory-scanner utility
 * TDD: Write tests first, verify they fail, then implement
 */
import { describe, expect, it } from 'bun:test';
import { scanDirectory, type DirectoryScannerOptions } from './directory-scanner.ts';

describe('scanDirectory', () => {
  describe('basic scanning with mock filesystem', () => {
    it('should return markdown files from directory', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/agents/': {
          type: 'directory',
          entries: [
            { name: 'agent1.md', isFile: true, isDirectory: false },
            { name: 'agent2.md', isFile: true, isDirectory: false },
          ],
        },
      };

      const result = await scanDirectory('/test/agents/', { _mockFileSystem: mockFs });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files).toContain('/test/agents/agent1.md');
      expect(result.files).toContain('/test/agents/agent2.md');
    });

    it('should filter files by .md extension', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/agents/': {
          type: 'directory',
          entries: [
            { name: 'agent1.md', isFile: true, isDirectory: false },
            { name: 'readme.txt', isFile: true, isDirectory: false },
            { name: 'config.json', isFile: true, isDirectory: false },
          ],
        },
      };

      const result = await scanDirectory('/test/agents/', { _mockFileSystem: mockFs });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files).toContain('/test/agents/agent1.md');
    });

    it('should return absolute file paths', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/home/user/.claude/agents/': {
          type: 'directory',
          entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
        },
      };

      const result = await scanDirectory('/home/user/.claude/agents/', {
        _mockFileSystem: mockFs,
      });

      expect(result.success).toBe(true);
      expect(result.files[0]).toBe('/home/user/.claude/agents/expert.md');
      expect(result.files[0]?.startsWith('/')).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should enforce 2-second timeout with Promise.race', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/slow/': {
          type: 'directory',
          entries: [],
          _delay: 3000, // Simulate slow directory read
        },
      };

      const startTime = Date.now();
      const result = await scanDirectory('/test/slow/', {
        _mockFileSystem: mockFs,
        timeoutMs: 2000,
      });
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(elapsed).toBeLessThan(2500); // Should timeout around 2s, not 3s
    });

    it('should return partial results on timeout', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/partial/': {
          type: 'directory',
          entries: [
            { name: 'fast1.md', isFile: true, isDirectory: false },
            { name: 'fast2.md', isFile: true, isDirectory: false },
          ],
          _partialOnTimeout: true, // Return what we have on timeout
          _delay: 3000,
        },
      };

      const result = await scanDirectory('/test/partial/', {
        _mockFileSystem: mockFs,
        timeoutMs: 100,
      });

      expect(result.timedOut).toBe(true);
      // Partial results should be available
      expect(result.files).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle ENOENT gracefully (missing directory)', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        // Directory doesn't exist in mock
      };

      const result = await scanDirectory('/nonexistent/path/', { _mockFileSystem: mockFs });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ENOENT');
      expect(result.files).toEqual([]);
    });

    it('should handle EACCES gracefully (permission denied)', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/protected/': {
          type: 'directory',
          _error: 'EACCES',
        },
      };

      const result = await scanDirectory('/test/protected/', { _mockFileSystem: mockFs });

      expect(result.success).toBe(false);
      expect(result.error).toBe('EACCES');
      expect(result.files).toEqual([]);
    });

    it('should handle ENOTDIR gracefully (path is file, not directory)', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/file.txt': {
          type: 'file',
          _error: 'ENOTDIR',
        },
      };

      const result = await scanDirectory('/test/file.txt', { _mockFileSystem: mockFs });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ENOTDIR');
      expect(result.files).toEqual([]);
    });
  });

  describe('custom extension filtering', () => {
    it('should support custom file extensions', async () => {
      const mockFs: DirectoryScannerOptions['_mockFileSystem'] = {
        '/test/mixed/': {
          type: 'directory',
          entries: [
            { name: 'script.ts', isFile: true, isDirectory: false },
            { name: 'style.css', isFile: true, isDirectory: false },
            { name: 'readme.md', isFile: true, isDirectory: false },
          ],
        },
      };

      const result = await scanDirectory('/test/mixed/', {
        _mockFileSystem: mockFs,
        extensions: ['.ts', '.css'],
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files).toContain('/test/mixed/script.ts');
      expect(result.files).toContain('/test/mixed/style.css');
    });
  });
});

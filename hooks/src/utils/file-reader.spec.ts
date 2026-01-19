/**
 * Tests for file-reader utility
 */
import { describe, expect, it } from 'bun:test';
import { readFileSyncSafe } from './file-reader.ts';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('readFileSyncSafe', () => {
  describe('with mock filesystem', () => {
    it('should return content from mock filesystem when file exists', () => {
      const mockFs = {
        '/test/file.txt': 'mock content',
      };

      const result = readFileSyncSafe('/test/file.txt', mockFs);

      expect(result).toBe('mock content');
    });

    it('should return null when file does not exist in mock filesystem', () => {
      const mockFs = {
        '/test/file.txt': 'mock content',
      };

      const result = readFileSyncSafe('/test/nonexistent.txt', mockFs);

      expect(result).toBeNull();
    });

    it('should return null when mock filesystem maps file to null', () => {
      const mockFs = {
        '/test/file.txt': null,
      };

      const result = readFileSyncSafe('/test/file.txt', mockFs);

      expect(result).toBeNull();
    });

    it('should handle UTF-8 content in mock filesystem', () => {
      const mockFs = {
        '/test/unicode.txt': 'Hello 🌍 World',
      };

      const result = readFileSyncSafe('/test/unicode.txt', mockFs);

      expect(result).toBe('Hello 🌍 World');
    });
  });

  describe('with real filesystem', () => {
    const testDir = join(tmpdir(), 'file-reader-test');
    const testFile = join(testDir, 'test.txt');

    it('should read existing file from real filesystem', () => {
      // Setup
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
      writeFileSync(testFile, 'real content', 'utf-8');

      // Test
      const result = readFileSyncSafe(testFile);

      // Verify
      expect(result).toBe('real content');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should return null when file does not exist', () => {
      const nonexistentPath = join(tmpdir(), 'nonexistent-file.txt');

      const result = readFileSyncSafe(nonexistentPath);

      expect(result).toBeNull();
    });

    it('should handle UTF-8 content from real filesystem', () => {
      // Setup
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
      writeFileSync(testFile, 'Hello 世界', 'utf-8');

      // Test
      const result = readFileSyncSafe(testFile);

      // Verify
      expect(result).toBe('Hello 世界');

      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should return null on read errors', () => {
      // Test with a path that will cause read error (directory instead of file)
      const result = readFileSyncSafe(tmpdir());

      // Reading a directory should fail and return null
      expect(result).toBeNull();
    });
  });
});

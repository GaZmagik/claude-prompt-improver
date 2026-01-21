/**
 * Tests for path-validator utility
 * TDD: Write tests first, verify they fail, then implement
 */
import { describe, expect, it } from 'bun:test';
import { isValidDiscoveryPath, validateDiscoveryPath } from './path-validator.ts';

describe('isValidDiscoveryPath', () => {
  describe('path traversal rejection', () => {
    it('should reject ".." sequences', () => {
      expect(isValidDiscoveryPath('/home/user/../etc/passwd')).toBe(false);
      expect(isValidDiscoveryPath('../../../etc/passwd')).toBe(false);
      expect(isValidDiscoveryPath('/home/user/..hidden')).toBe(false);
      expect(isValidDiscoveryPath('foo/..bar')).toBe(false);
    });

    it('should reject null bytes (\\0)', () => {
      expect(isValidDiscoveryPath('/home/user\0/file')).toBe(false);
      expect(isValidDiscoveryPath('file\0.md')).toBe(false);
      expect(isValidDiscoveryPath('\0')).toBe(false);
    });
  });

  describe('valid paths', () => {
    it('should accept simple directory paths', () => {
      expect(isValidDiscoveryPath('/home/user/.claude/agents/')).toBe(true);
      expect(isValidDiscoveryPath('/Users/name/.claude/commands/')).toBe(true);
      expect(isValidDiscoveryPath('.claude/agents/')).toBe(true);
    });

    it('should accept paths with hyphens and underscores', () => {
      expect(isValidDiscoveryPath('/home/user/.claude/output-styles/')).toBe(true);
      expect(isValidDiscoveryPath('/path/to/my_agents/')).toBe(true);
      expect(isValidDiscoveryPath('/path/test-dir/sub_dir/')).toBe(true);
    });

    it('should accept paths with dots in filenames', () => {
      expect(isValidDiscoveryPath('/home/user/.claude/')).toBe(true);
      expect(isValidDiscoveryPath('/path/to/file.spec.ts')).toBe(true);
      expect(isValidDiscoveryPath('.hidden-dir/')).toBe(true);
    });

    it('should accept Windows-style paths with colons', () => {
      expect(isValidDiscoveryPath('C:/Users/name/.claude/')).toBe(true);
      expect(isValidDiscoveryPath('D:/projects/agents/')).toBe(true);
    });

    it('should accept empty or undefined paths (use defaults)', () => {
      expect(isValidDiscoveryPath('')).toBe(true);
      expect(isValidDiscoveryPath(undefined)).toBe(true);
    });
  });

  describe('dangerous characters', () => {
    it('should reject shell metacharacters', () => {
      expect(isValidDiscoveryPath('/path/$(whoami)/')).toBe(false);
      expect(isValidDiscoveryPath('/path/`id`/')).toBe(false);
      expect(isValidDiscoveryPath('/path/;rm -rf/')).toBe(false);
      expect(isValidDiscoveryPath('/path/|cat /etc/passwd')).toBe(false);
    });

    it('should reject paths with newlines', () => {
      expect(isValidDiscoveryPath('/path/to\n/file')).toBe(false);
      expect(isValidDiscoveryPath('/path\r\ninjection')).toBe(false);
    });

    it('should reject paths with special unicode', () => {
      // Zero-width characters could be used to hide malicious paths
      expect(isValidDiscoveryPath('/path/\u200B/file')).toBe(false); // zero-width space
      expect(isValidDiscoveryPath('/path/\u2028/file')).toBe(false); // line separator
    });
  });
});

describe('validateDiscoveryPath', () => {
  it('should return success for valid paths', () => {
    const result = validateDiscoveryPath('/home/user/.claude/agents/');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return error details for invalid paths', () => {
    const result = validateDiscoveryPath('/path/../etc/passwd');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('traversal');
  });

  it('should identify null byte injection', () => {
    const result = validateDiscoveryPath('/path\0injection');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('null');
  });

  it('should identify shell metacharacters', () => {
    const result = validateDiscoveryPath('/path/$(cmd)/');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('character');
  });
});

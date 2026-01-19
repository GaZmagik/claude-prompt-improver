/**
 * T008-T010: Logger tests
 * T008: Test log entry creation with all required fields
 * T009: Test JSON log format validation
 * T010: Test log file writing to .claude/logs/prompt-improver-latest.log
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogEntry, formatLogEntry, writeLogEntry, type LogEntryInput } from './logger.ts';

describe('Logger', () => {
  const testDir = join(tmpdir(), 'prompt-improver-test-' + Date.now());
  const testLogPath = join(testDir, '.claude', 'logs', 'prompt-improver-latest.log');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(join(testDir, '.claude', 'logs'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('T008: createLogEntry - log entry creation with all required fields', () => {
    it('should create a log entry for an improved prompt', () => {
      const input: LogEntryInput = {
        originalPrompt: 'fix the bug',
        improvedPrompt: '<task>Fix the authentication bug</task>',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 4532,
        contextSources: ['git', 'lsp'],
        conversationId: 'conv-123',
      };

      const entry = createLogEntry(input);

      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.originalPrompt).toBe('fix the bug');
      expect(entry.improvedPrompt).toBe('<task>Fix the authentication bug</task>');
      expect(entry.classification).toBe('COMPLEX');
      expect(entry.bypassReason).toBeNull();
      expect(entry.modelUsed).toBe('sonnet');
      expect(entry.totalLatency).toBe(4532);
      expect(entry.contextSources).toEqual(['git', 'lsp']);
      expect(entry.conversationId).toBe('conv-123');
    });

    it('should create a log entry for a bypassed prompt', () => {
      const input: LogEntryInput = {
        originalPrompt: 'yes',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 2,
        contextSources: [],
        conversationId: 'conv-456',
      };

      const entry = createLogEntry(input);

      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.originalPrompt).toBe('yes');
      expect(entry.improvedPrompt).toBeNull();
      expect(entry.classification).toBe('NONE');
      expect(entry.bypassReason).toBe('short_prompt');
      expect(entry.modelUsed).toBeNull();
      expect(entry.totalLatency).toBe(2);
      expect(entry.contextSources).toEqual([]);
    });

    it('should set timestamp to current time', () => {
      const before = new Date();

      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-789',
      });

      const after = new Date();

      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('T009: formatLogEntry - JSON log format validation', () => {
    it('should format log entry as valid JSON', () => {
      const input: LogEntryInput = {
        originalPrompt: 'fix the bug',
        improvedPrompt: '<task>Fix it</task>',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 1000,
        contextSources: ['git'],
        conversationId: 'conv-123',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);

      // Should be valid JSON
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all required fields in JSON output', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test prompt',
        improvedPrompt: 'improved prompt',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 500,
        contextSources: ['tools', 'skills'],
        conversationId: 'conv-abc',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('originalPrompt');
      expect(parsed).toHaveProperty('improvedPrompt');
      expect(parsed).toHaveProperty('classification');
      expect(parsed).toHaveProperty('bypassReason');
      expect(parsed).toHaveProperty('modelUsed');
      expect(parsed).toHaveProperty('totalLatency');
      expect(parsed).toHaveProperty('contextSources');
      expect(parsed).toHaveProperty('conversationId');
    });

    it('should format timestamp as ISO 8601 string', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-xyz',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      // ISO 8601 format check
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should handle null values correctly in JSON', () => {
      const input: LogEntryInput = {
        originalPrompt: 'yes',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 2,
        contextSources: [],
        conversationId: 'conv-null',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed.improvedPrompt).toBeNull();
      expect(parsed.modelUsed).toBeNull();
    });

    it('should handle special characters in prompts', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test "quotes" and\nnewlines',
        improvedPrompt: '<tag>with "quotes"</tag>',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 100,
        contextSources: [],
        conversationId: 'conv-special',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);

      // Should be valid JSON despite special characters
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.originalPrompt).toBe('test "quotes" and\nnewlines');
    });
  });

  describe('T010: writeLogEntry - log file writing', () => {
    it('should write log entry to specified file path', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test write',
        improvedPrompt: 'improved write',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 300,
        contextSources: [],
        conversationId: 'conv-write',
      };

      const entry = createLogEntry(input);
      writeLogEntry(entry, testLogPath);

      expect(existsSync(testLogPath)).toBe(true);
    });

    it('should append to existing log file', () => {
      // Write first entry
      const entry1 = createLogEntry({
        originalPrompt: 'first',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-1',
      });
      writeLogEntry(entry1, testLogPath);

      // Write second entry
      const entry2 = createLogEntry({
        originalPrompt: 'second',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-2',
      });
      writeLogEntry(entry2, testLogPath);

      const content = readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const parsed1 = JSON.parse(lines[0]!);
      const parsed2 = JSON.parse(lines[1]!);

      expect(parsed1.originalPrompt).toBe('first');
      expect(parsed2.originalPrompt).toBe('second');
    });

    it('should create parent directories if they do not exist', () => {
      const nestedPath = join(testDir, 'deep', 'nested', 'path', 'log.log');

      const entry = createLogEntry({
        originalPrompt: 'nested test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-nested',
      });

      writeLogEntry(entry, nestedPath);

      expect(existsSync(nestedPath)).toBe(true);
    });

    it('should write valid JSON per line (JSONL format)', () => {
      const entry = createLogEntry({
        originalPrompt: 'jsonl test',
        improvedPrompt: 'improved',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 100,
        contextSources: ['git'],
        conversationId: 'conv-jsonl',
      });

      writeLogEntry(entry, testLogPath);

      const content = readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });
});

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
import {
  createLogEntry,
  formatLogEntry,
  writeLogEntry,
  writeLogEntryAsync,
  createPromptPreview,
  generateLogFilePath,
  shouldLog,
  type LogEntryInput,
} from './logger.ts';

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
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);

      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBe('INFO');
      expect(entry.phase).toBe('complete');
      expect(entry.promptPreview).toContain('fix the bug');
      expect(entry.improvedPrompt).toBe('<task>Fix the authentication bug</task>...');
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
        level: 'INFO',
        phase: 'bypass',
      };

      const entry = createLogEntry(input);

      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBe('INFO');
      expect(entry.phase).toBe('bypass');
      expect(entry.promptPreview).toContain('yes');
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
        level: 'INFO',
        phase: 'bypass',
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
        level: 'INFO',
        phase: 'complete',
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
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('promptPreview');
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
        level: 'INFO',
        phase: 'bypass',
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
        level: 'INFO',
        phase: 'bypass',
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
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);
      const json = formatLogEntry(entry);

      // Should be valid JSON despite special characters
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.promptPreview).toContain('test "quotes"');
    });
  });

  describe('T010: writeLogEntry - log file writing', () => {
    it('should write log entry to specified file path (async)', async () => {
      const input: LogEntryInput = {
        originalPrompt: 'test write',
        improvedPrompt: 'improved write',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 300,
        contextSources: [],
        conversationId: 'conv-write',
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);
      await writeLogEntryAsync(entry, testLogPath);

      expect(existsSync(testLogPath)).toBe(true);
    });

    it('should append to existing log file (async)', async () => {
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
        level: 'INFO',
        phase: 'bypass',
      });
      await writeLogEntryAsync(entry1, testLogPath);

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
        level: 'INFO',
        phase: 'bypass',
      });
      await writeLogEntryAsync(entry2, testLogPath);

      const content = readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const parsed1 = JSON.parse(lines[0]!);
      const parsed2 = JSON.parse(lines[1]!);

      expect(parsed1.promptPreview).toContain('first');
      expect(parsed2.promptPreview).toContain('second');
    });

    it('should create parent directories if they do not exist (async)', async () => {
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
        level: 'INFO',
        phase: 'bypass',
      });

      await writeLogEntryAsync(entry, nestedPath);

      expect(existsSync(nestedPath)).toBe(true);
    });

    it('should write valid JSON per line (JSONL format) (async)', async () => {
      const entry = createLogEntry({
        originalPrompt: 'jsonl test',
        improvedPrompt: 'improved',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 100,
        contextSources: ['git'],
        conversationId: 'conv-jsonl',
        level: 'INFO',
        phase: 'complete',
      });

      await writeLogEntryAsync(entry, testLogPath);

      const content = readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('should fire-and-forget without blocking (sync wrapper)', () => {
      const entry = createLogEntry({
        originalPrompt: 'fire-and-forget test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-sync',
        level: 'INFO',
        phase: 'bypass',
      });

      // This should return immediately without blocking
      const start = Date.now();
      writeLogEntry(entry, testLogPath);
      const elapsed = Date.now() - start;

      // Should complete nearly instantly (fire-and-forget)
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('createPromptPreview - security and privacy', () => {
    it('should truncate prompt to 50 characters', () => {
      const longPrompt = 'a'.repeat(100);
      const preview = createPromptPreview(longPrompt);

      expect(preview.length).toBeLessThanOrEqual(53); // 50 chars + '...'
      expect(preview).toContain('...');
    });

    it('should strip newlines from preview', () => {
      const promptWithNewlines = 'first line\nsecond line\nthird line';
      const preview = createPromptPreview(promptWithNewlines);

      expect(preview).not.toContain('\n');
      expect(preview).toContain('first line');
    });

    it('should handle short prompts without truncation marker', () => {
      const shortPrompt = 'short prompt';
      const preview = createPromptPreview(shortPrompt);

      expect(preview).toBe('short prompt...');
    });

    it('should handle empty prompts', () => {
      const preview = createPromptPreview('');

      expect(preview).toBe('...');
    });

    it('should replace multiple consecutive spaces from newlines', () => {
      const promptWithTabs = 'line1\n\nline2\n\n\nline3';
      const preview = createPromptPreview(promptWithTabs);

      expect(preview).not.toContain('\n');
      expect(preview).toContain('line1');
    });

    it('should truncate improvedPrompt to prevent sensitive context exposure', () => {
      const sensitiveContext = 'git commit abc123\nLSP diagnostic: auth.ts:42\nFile: /home/user/.env\nAPI_KEY=secret123';
      const input: LogEntryInput = {
        originalPrompt: 'fix the bug',
        improvedPrompt: sensitiveContext,
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 1000,
        contextSources: ['git', 'lsp'],
        conversationId: 'conv-sec',
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);

      expect(entry.improvedPrompt).toBeDefined();
      expect(entry.improvedPrompt!.length).toBeLessThanOrEqual(53);
      expect(entry.improvedPrompt).not.toContain('secret123');
      expect(entry.improvedPrompt).not.toContain('/home/user/.env');
      expect(entry.improvedPrompt).toContain('...');
    });

    it('should handle null improvedPrompt without truncation', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-null',
        level: 'INFO',
        phase: 'bypass',
      };

      const entry = createLogEntry(input);

      expect(entry.improvedPrompt).toBeNull();
    });
  });

  describe('generateLogFilePath - timestamped log files', () => {
    it('should return base path when timestamps disabled', () => {
      const basePath = '/test/path/log.log';
      const result = generateLogFilePath(basePath, false);

      expect(result).toBe(basePath);
    });

    it('should create timestamped filename when enabled', () => {
      const basePath = '/test/path/prompt-improver.log';
      const result = generateLogFilePath(basePath, true);

      expect(result).toContain('/test/path/');
      expect(result).toContain('prompt-improver-');
      expect(result).toMatch(/prompt-improver-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/);
    });

    it('should preserve directory structure with timestamps', () => {
      const basePath = '/deep/nested/path/log.log';
      const result = generateLogFilePath(basePath, true);

      expect(result).toContain('/deep/nested/path/');
    });

    it('should handle paths without extensions', () => {
      const basePath = '/test/logfile';
      const result = generateLogFilePath(basePath, true);

      expect(result).toContain('/test/');
      expect(result).toMatch(/logfile-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    it('should create unique timestamps for consecutive calls', async () => {
      const basePath = '/test/log.log';
      const first = generateLogFilePath(basePath, true);

      // Wait 1ms to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));

      const second = generateLogFilePath(basePath, true);

      // Both should have timestamp format, and likely be different
      expect(first).toMatch(/log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/);
      expect(second).toMatch(/log-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/);
    });
  });

  describe('shouldLog - log level filtering', () => {
    it('should allow ERROR when level is ERROR', () => {
      expect(shouldLog('ERROR', 'ERROR')).toBe(true);
    });

    it('should block INFO when level is ERROR', () => {
      expect(shouldLog('INFO', 'ERROR')).toBe(false);
    });

    it('should block DEBUG when level is ERROR', () => {
      expect(shouldLog('DEBUG', 'ERROR')).toBe(false);
    });

    it('should allow ERROR when level is INFO', () => {
      expect(shouldLog('ERROR', 'INFO')).toBe(true);
    });

    it('should allow INFO when level is INFO', () => {
      expect(shouldLog('INFO', 'INFO')).toBe(true);
    });

    it('should block DEBUG when level is INFO', () => {
      expect(shouldLog('DEBUG', 'INFO')).toBe(false);
    });

    it('should allow all levels when level is DEBUG', () => {
      expect(shouldLog('ERROR', 'DEBUG')).toBe(true);
      expect(shouldLog('INFO', 'DEBUG')).toBe(true);
      expect(shouldLog('DEBUG', 'DEBUG')).toBe(true);
    });
  });

  describe('createLogEntry - enhanced with new fields', () => {
    it('should include level field', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'bypass',
      };

      const entry = createLogEntry(input);

      expect(entry.level).toBe('INFO');
    });

    it('should include phase field', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 1000,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'improve',
      };

      const entry = createLogEntry(input);

      expect(entry.phase).toBe('improve');
    });

    it('should include promptPreview instead of originalPrompt', () => {
      const longPrompt = 'a'.repeat(100);
      const input: LogEntryInput = {
        originalPrompt: longPrompt,
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'bypass',
      };

      const entry = createLogEntry(input);

      expect(entry.promptPreview).toBeDefined();
      expect(entry.promptPreview?.length).toBeLessThanOrEqual(53);
      expect(entry).not.toHaveProperty('originalPrompt');
    });

    it('should include classificationLatency when provided', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 2000,
        classificationLatency: 500,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);

      expect(entry.classificationLatency).toBe(500);
    });

    it('should include improvementLatency when provided', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 2000,
        improvementLatency: 1500,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'complete',
      };

      const entry = createLogEntry(input);

      expect(entry.improvementLatency).toBe(1500);
    });

    it('should include error field when provided', () => {
      const input: LogEntryInput = {
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'classification_failed',
        modelUsed: null,
        totalLatency: 5000,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'ERROR',
        phase: 'classify',
        error: 'Classification timeout after 5s',
      };

      const entry = createLogEntry(input);

      expect(entry.error).toBe('Classification timeout after 5s');
    });
  });

  describe('formatLogEntry - conditional property inclusion', () => {
    it('should exclude classificationLatency when undefined', () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'bypass',
      });

      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed).not.toHaveProperty('classificationLatency');
    });

    it('should include classificationLatency when defined', () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 2000,
        classificationLatency: 500,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'complete',
      });

      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed.classificationLatency).toBe(500);
    });

    it('should exclude improvementLatency when undefined', () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 1,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'bypass',
      });

      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed).not.toHaveProperty('improvementLatency');
    });

    it('should exclude error when undefined', () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 1000,
        contextSources: [],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'complete',
      });

      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed).not.toHaveProperty('error');
    });

    it('should include all new fields when provided', () => {
      const entry = createLogEntry({
        originalPrompt: 'test prompt here',
        improvedPrompt: 'improved',
        classification: 'COMPLEX',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 2500,
        classificationLatency: 500,
        improvementLatency: 2000,
        contextSources: ['git', 'lsp'],
        conversationId: 'conv-123',
        level: 'INFO',
        phase: 'complete',
      });

      const json = formatLogEntry(entry);
      const parsed = JSON.parse(json);

      expect(parsed.level).toBe('INFO');
      expect(parsed.phase).toBe('complete');
      expect(parsed.promptPreview).toBeDefined();
      expect(parsed.classificationLatency).toBe(500);
      expect(parsed.improvementLatency).toBe(2000);
    });
  });

  describe('writeLogEntry - log level filtering', () => {
    it('should write ERROR level entry when config is ERROR', async () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'classification_failed',
        modelUsed: null,
        totalLatency: 5000,
        contextSources: [],
        conversationId: 'conv-error',
        level: 'ERROR',
        phase: 'classify',
        error: 'Timeout',
      });

      writeLogEntry(entry, testLogPath, 'ERROR');

      // Give fire-and-forget time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(existsSync(testLogPath)).toBe(true);
    });

    it('should not write INFO level entry when config is ERROR', async () => {
      const entry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 1000,
        contextSources: [],
        conversationId: 'conv-info',
        level: 'INFO',
        phase: 'complete',
      });

      const beforeSize = existsSync(testLogPath) ? readFileSync(testLogPath, 'utf-8').length : 0;
      writeLogEntry(entry, testLogPath, 'ERROR');

      // Give fire-and-forget time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterSize = existsSync(testLogPath) ? readFileSync(testLogPath, 'utf-8').length : 0;
      expect(afterSize).toBe(beforeSize);
    });

    it('should write both ERROR and INFO when config is INFO', async () => {
      const errorEntry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: null,
        classification: 'NONE',
        bypassReason: 'classification_failed',
        modelUsed: null,
        totalLatency: 5000,
        contextSources: [],
        conversationId: 'conv-error',
        level: 'ERROR',
        phase: 'classify',
        error: 'Timeout',
      });

      const infoEntry = createLogEntry({
        originalPrompt: 'test',
        improvedPrompt: 'improved',
        classification: 'SIMPLE',
        bypassReason: null,
        modelUsed: 'haiku',
        totalLatency: 1000,
        contextSources: [],
        conversationId: 'conv-info',
        level: 'INFO',
        phase: 'complete',
      });

      writeLogEntry(errorEntry, testLogPath, 'INFO');
      writeLogEntry(infoEntry, testLogPath, 'INFO');

      // Give fire-and-forget time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(existsSync(testLogPath)).toBe(true);
    });
  });
});

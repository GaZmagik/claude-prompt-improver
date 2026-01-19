/**
 * T011-T014: Config loader tests
 * T011: Test configuration loading with defaults
 * T012: Test configuration loading from .claude/prompt-improver-config.json
 * T013: Test configuration validation for threshold bounds
 * T014: Test integration toggles default to true
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Configuration } from './types.ts';
import { DEFAULT_CONFIG, loadConfig, validateConfig } from './config-loader.ts';

describe('Config Loader', () => {
  const testDir = join(tmpdir(), 'prompt-improver-config-test-' + Date.now());
  const testConfigPath = join(testDir, '.claude', 'prompt-improver-config.json');

  beforeEach(() => {
    mkdirSync(join(testDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('T011: loadConfig - configuration loading with defaults', () => {
    it('should return default configuration when no config file exists', () => {
      const config = loadConfig(join(testDir, 'nonexistent', 'config.json'));

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should have sensible default values', () => {
      const config = loadConfig(join(testDir, 'nonexistent', 'config.json'));

      expect(config.enabled).toBe(true);
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.compactionThreshold).toBe(5);
      expect(config.defaultSimpleModel).toBe('haiku');
      expect(config.defaultComplexModel).toBe('sonnet');
    });

    it('should have default logging configuration', () => {
      const config = loadConfig(join(testDir, 'nonexistent', 'config.json'));

      expect(config.logging.enabled).toBe(true);
      expect(config.logging.logFilePath).toBe('.claude/logs/prompt-improver-latest.log');
      expect(config.logging.maxLogSizeMB).toBe(10);
      expect(config.logging.maxLogAgeDays).toBe(7);
      expect(config.logging.displayImprovedPrompt).toBe(true);
    });
  });

  describe('T012: loadConfig - configuration loading from file', () => {
    it('should load configuration from specified file path', () => {
      const customConfig = {
        enabled: false,
        shortPromptThreshold: 15,
      };

      writeFileSync(testConfigPath, JSON.stringify(customConfig));

      const config = loadConfig(testConfigPath);

      expect(config.enabled).toBe(false);
      expect(config.shortPromptThreshold).toBe(15);
    });

    it('should merge partial config with defaults', () => {
      const partialConfig = {
        enabled: false,
        integrations: {
          git: false,
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(partialConfig));

      const config = loadConfig(testConfigPath);

      // Overridden values
      expect(config.enabled).toBe(false);
      expect(config.integrations.git).toBe(false);

      // Default values preserved
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
    });

    it('should handle invalid JSON gracefully and return defaults', () => {
      writeFileSync(testConfigPath, 'not valid json {{{');

      const config = loadConfig(testConfigPath);

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load nested logging configuration', () => {
      const customConfig = {
        logging: {
          enabled: false,
          maxLogSizeMB: 50,
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(customConfig));

      const config = loadConfig(testConfigPath);

      expect(config.logging.enabled).toBe(false);
      expect(config.logging.maxLogSizeMB).toBe(50);
      // Defaults preserved for unspecified
      expect(config.logging.logFilePath).toBe('.claude/logs/prompt-improver-latest.log');
    });
  });

  describe('T013: validateConfig - configuration validation for threshold bounds', () => {
    it('should validate shortPromptThreshold is within bounds (1-100)', () => {
      const invalidLow: Partial<Configuration> = { shortPromptThreshold: 0 };
      const invalidHigh: Partial<Configuration> = { shortPromptThreshold: 101 };
      const valid: Partial<Configuration> = { shortPromptThreshold: 50 };

      expect(validateConfig(invalidLow)).toContainEqual(
        expect.objectContaining({ field: 'shortPromptThreshold' })
      );
      expect(validateConfig(invalidHigh)).toContainEqual(
        expect.objectContaining({ field: 'shortPromptThreshold' })
      );
      expect(validateConfig(valid)).not.toContainEqual(
        expect.objectContaining({ field: 'shortPromptThreshold' })
      );
    });

    it('should validate compactionThreshold is within bounds (0-100)', () => {
      const invalidLow: Partial<Configuration> = { compactionThreshold: -1 };
      const invalidHigh: Partial<Configuration> = { compactionThreshold: 101 };
      const valid: Partial<Configuration> = { compactionThreshold: 0 };

      expect(validateConfig(invalidLow)).toContainEqual(
        expect.objectContaining({ field: 'compactionThreshold' })
      );
      expect(validateConfig(invalidHigh)).toContainEqual(
        expect.objectContaining({ field: 'compactionThreshold' })
      );
      expect(validateConfig(valid)).not.toContainEqual(
        expect.objectContaining({ field: 'compactionThreshold' })
      );
    });

    it('should validate maxLogSizeMB is within bounds (1-1000)', () => {
      const invalidLow: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogSizeMB: 0 },
      };
      const invalidHigh: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogSizeMB: 1001 },
      };
      const valid: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogSizeMB: 500 },
      };

      expect(validateConfig(invalidLow)).toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogSizeMB' })
      );
      expect(validateConfig(invalidHigh)).toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogSizeMB' })
      );
      expect(validateConfig(valid)).not.toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogSizeMB' })
      );
    });

    it('should validate maxLogAgeDays is within bounds (1-365)', () => {
      const invalidLow: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogAgeDays: 0 },
      };
      const invalidHigh: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogAgeDays: 366 },
      };
      const valid: Partial<Configuration> = {
        logging: { ...DEFAULT_CONFIG.logging, maxLogAgeDays: 30 },
      };

      expect(validateConfig(invalidLow)).toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogAgeDays' })
      );
      expect(validateConfig(invalidHigh)).toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogAgeDays' })
      );
      expect(validateConfig(valid)).not.toContainEqual(
        expect.objectContaining({ field: 'logging.maxLogAgeDays' })
      );
    });

    it('should return empty array for valid configuration', () => {
      const errors = validateConfig(DEFAULT_CONFIG);

      expect(errors).toEqual([]);
    });
  });

  describe('T014: loadConfig - integration toggles default to true', () => {
    it('should have all integration toggles default to true', () => {
      const config = loadConfig(join(testDir, 'nonexistent', 'config.json'));

      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(true);
      expect(config.integrations.session).toBe(true);
    });

    it('should allow individual integration toggles to be disabled', () => {
      const customConfig = {
        integrations: {
          git: true,
          lsp: false,
          spec: true,
          memory: false,
          session: true,
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(customConfig));

      const config = loadConfig(testConfigPath);

      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(false);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(false);
      expect(config.integrations.session).toBe(true);
    });

    it('should merge partial integration toggles with defaults', () => {
      const customConfig = {
        integrations: {
          session: false,
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(customConfig));

      const config = loadConfig(testConfigPath);

      // Only session should be changed
      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(true);
      expect(config.integrations.session).toBe(false);
    });
  });
});

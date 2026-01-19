/**
 * T011-T014: Config loader tests
 * T011: Test configuration loading with defaults
 * T012: Test configuration loading from .claude/prompt-improver.local.md
 * T013: Test configuration validation for threshold bounds
 * T014: Test integration toggles default to true
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Configuration } from './types.ts';
import {
  clearConfigCache,
  CONFIG_PATHS,
  DEFAULT_CONFIG,
  loadConfig,
  loadConfigFromStandardPaths,
  parseYamlFrontmatter,
  validateConfig,
} from './config-loader.ts';

describe('Config Loader', () => {
  const testDir = join(tmpdir(), 'prompt-improver-config-test-' + Date.now());
  const testConfigPathMd = join(testDir, '.claude', 'prompt-improver.local.md');
  const testConfigPathJson = join(testDir, '.claude', 'prompt-improver-config.json');

  beforeEach(() => {
    clearConfigCache(); // Clear cache before each test
    mkdirSync(join(testDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseYamlFrontmatter', () => {
    it('should parse simple key-value pairs', () => {
      const content = `---
enabled: true
shortPromptThreshold: 15
---
# Documentation here`;

      const result = parseYamlFrontmatter(content);

      expect(result.enabled).toBe(true);
      expect(result.shortPromptThreshold).toBe(15);
    });

    it('should parse nested sections', () => {
      const content = `---
enabled: true
integrations:
  git: false
  lsp: true
---`;

      const result = parseYamlFrontmatter(content);

      expect(result.enabled).toBe(true);
      expect(result.integrations).toEqual({ git: false, lsp: true });
    });

    it('should skip comments', () => {
      const content = `---
# This is a comment
enabled: false
# Another comment
shortPromptThreshold: 20
---`;

      const result = parseYamlFrontmatter(content);

      expect(result.enabled).toBe(false);
      expect(result.shortPromptThreshold).toBe(20);
    });

    it('should handle quoted strings', () => {
      const content = `---
logFilePath: ".claude/logs/test.log"
---`;

      const result = parseYamlFrontmatter(content);

      expect(result.logFilePath).toBe('.claude/logs/test.log');
    });

    it('should return empty object for no frontmatter', () => {
      const content = `# Just documentation
No frontmatter here`;

      const result = parseYamlFrontmatter(content);

      expect(result).toEqual({});
    });

    it('should parse floats', () => {
      const content = `---
threshold: 0.75
---`;

      const result = parseYamlFrontmatter(content);

      expect(result.threshold).toBe(0.75);
    });

    it('should support snake_case keys', () => {
      const content = `---
short_prompt_threshold: 25
compaction_threshold: 10
---`;

      const result = parseYamlFrontmatter(content);

      expect(result.short_prompt_threshold).toBe(25);
      expect(result.compaction_threshold).toBe(10);
    });
  });

  describe('T011: loadConfig - configuration loading with defaults', () => {
    it('should return default configuration when no config file exists', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should have sensible default values', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.enabled).toBe(true);
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.compactionThreshold).toBe(5);
      expect(config.defaultSimpleModel).toBe('haiku');
      expect(config.defaultComplexModel).toBe('sonnet');
    });

    it('should have default logging configuration', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.logging.enabled).toBe(true);
      expect(config.logging.logFilePath).toBe('.claude/logs/prompt-improver-latest.log');
      expect(config.logging.maxLogSizeMB).toBe(10);
      expect(config.logging.maxLogAgeDays).toBe(7);
      expect(config.logging.displayImprovedPrompt).toBe(true);
    });
  });

  describe('T012: loadConfig - configuration loading from markdown file', () => {
    it('should load configuration from markdown file with YAML frontmatter', async () => {
      const markdownConfig = `---
enabled: false
shortPromptThreshold: 15
---
# Configuration Documentation

This file configures the prompt improver plugin.`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.enabled).toBe(false);
      expect(config.shortPromptThreshold).toBe(15);
    });

    it('should merge partial markdown config with defaults', async () => {
      const markdownConfig = `---
enabled: false
integrations:
  git: false
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      // Overridden values
      expect(config.enabled).toBe(false);
      expect(config.integrations.git).toBe(false);

      // Default values preserved
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
    });

    it('should handle invalid markdown gracefully and return defaults', async () => {
      writeFileSync(testConfigPathMd, '# No frontmatter here\nJust text');

      const config = await loadConfig(testConfigPathMd);

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load nested logging configuration from markdown', async () => {
      const markdownConfig = `---
logging:
  enabled: false
  maxLogSizeMB: 50
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.enabled).toBe(false);
      expect(config.logging.maxLogSizeMB).toBe(50);
      // Defaults preserved for unspecified
      expect(config.logging.logFilePath).toBe('.claude/logs/prompt-improver-latest.log');
    });

    it('should support snake_case keys in markdown', async () => {
      const markdownConfig = `---
short_prompt_threshold: 20
compaction_threshold: 8
simple_model: sonnet
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.shortPromptThreshold).toBe(20);
      expect(config.compactionThreshold).toBe(8);
      expect(config.defaultSimpleModel).toBe('sonnet');
    });
  });

  describe('T012: loadConfig - legacy JSON format support', () => {
    it('should load configuration from JSON file', async () => {
      const customConfig = {
        enabled: false,
        shortPromptThreshold: 15,
      };

      writeFileSync(testConfigPathJson, JSON.stringify(customConfig));

      const config = await loadConfig(testConfigPathJson);

      expect(config.enabled).toBe(false);
      expect(config.shortPromptThreshold).toBe(15);
    });

    it('should merge partial JSON config with defaults', async () => {
      const partialConfig = {
        enabled: false,
        integrations: {
          git: false,
        },
      };

      writeFileSync(testConfigPathJson, JSON.stringify(partialConfig));

      const config = await loadConfig(testConfigPathJson);

      // Overridden values
      expect(config.enabled).toBe(false);
      expect(config.integrations.git).toBe(false);

      // Default values preserved
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.integrations.lsp).toBe(true);
    });

    it('should handle invalid JSON gracefully and return defaults', async () => {
      writeFileSync(testConfigPathJson, 'not valid json {{{');

      const config = await loadConfig(testConfigPathJson);

      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('loadConfigFromStandardPaths', () => {
    it('should check paths in order of precedence', async () => {
      expect(CONFIG_PATHS[0]).toBe('.claude/prompt-improver.local.md');
      expect(CONFIG_PATHS[1]).toBe('.claude/prompt-improver-config.json');
    });

    it('should prefer markdown over JSON when both exist', async () => {
      const mdConfig = `---
shortPromptThreshold: 25
---`;
      const jsonConfig = { shortPromptThreshold: 30 };

      writeFileSync(testConfigPathMd, mdConfig);
      writeFileSync(testConfigPathJson, JSON.stringify(jsonConfig));

      const config = await loadConfigFromStandardPaths(testDir);

      expect(config.shortPromptThreshold).toBe(25); // From markdown
    });

    it('should fall back to JSON when markdown does not exist', async () => {
      const jsonConfig = { shortPromptThreshold: 30 };
      writeFileSync(testConfigPathJson, JSON.stringify(jsonConfig));

      const config = await loadConfigFromStandardPaths(testDir);

      expect(config.shortPromptThreshold).toBe(30);
    });

    it('should return defaults when no config files exist', async () => {
      const config = await loadConfigFromStandardPaths(testDir);

      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('Config caching with mtime check', () => {
    it('should return cached config when file unchanged', async () => {
      const mdConfig = `---
shortPromptThreshold: 42
---`;
      writeFileSync(testConfigPathMd, mdConfig);

      // First load
      const config1 = await loadConfig(testConfigPathMd);
      expect(config1.shortPromptThreshold).toBe(42);

      // Second load should use cache (same result)
      const config2 = await loadConfig(testConfigPathMd);
      expect(config2.shortPromptThreshold).toBe(42);
      expect(config2).toEqual(config1);
    });

    it('should reload config when file mtime changes', async () => {
      const mdConfig1 = `---
shortPromptThreshold: 42
---`;
      writeFileSync(testConfigPathMd, mdConfig1);

      const config1 = await loadConfig(testConfigPathMd);
      expect(config1.shortPromptThreshold).toBe(42);

      // Wait a moment to ensure mtime changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update file with new content
      const mdConfig2 = `---
shortPromptThreshold: 99
---`;
      writeFileSync(testConfigPathMd, mdConfig2);

      // Should detect mtime change and reload
      const config2 = await loadConfig(testConfigPathMd);
      expect(config2.shortPromptThreshold).toBe(99);
    });

    it('should clear cache when clearConfigCache is called', async () => {
      const mdConfig = `---
shortPromptThreshold: 42
---`;
      writeFileSync(testConfigPathMd, mdConfig);

      await loadConfig(testConfigPathMd);
      clearConfigCache();

      // After clearing, should still work (reloads from disk)
      const config = await loadConfig(testConfigPathMd);
      expect(config.shortPromptThreshold).toBe(42);
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
    it('should have all integration toggles default to true', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(true);
      expect(config.integrations.session).toBe(true);
    });

    it('should allow individual integration toggles to be disabled via markdown', async () => {
      const markdownConfig = `---
integrations:
  git: true
  lsp: false
  spec: true
  memory: false
  session: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(false);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(false);
      expect(config.integrations.session).toBe(true);
    });

    it('should merge partial integration toggles with defaults', async () => {
      const markdownConfig = `---
integrations:
  session: false
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      // Only session should be changed
      expect(config.integrations.git).toBe(true);
      expect(config.integrations.lsp).toBe(true);
      expect(config.integrations.spec).toBe(true);
      expect(config.integrations.memory).toBe(true);
      expect(config.integrations.session).toBe(false);
    });
  });

  describe('Configuration - forceImprove field', () => {
    it('should default forceImprove to false', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.forceImprove).toBe(false);
    });

    it('should parse forceImprove from camelCase', async () => {
      const markdownConfig = `---
forceImprove: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.forceImprove).toBe(true);
    });

    it('should parse forceImprove from snake_case', async () => {
      const markdownConfig = `---
force_improve: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.forceImprove).toBe(true);
    });

    it('should merge forceImprove with defaults', async () => {
      const markdownConfig = `---
enabled: true
forceImprove: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.enabled).toBe(true);
      expect(config.forceImprove).toBe(true);
    });
  });

  describe('Configuration - logging.logLevel field', () => {
    it('should default logLevel to INFO', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.logging.logLevel).toBe('INFO');
    });

    it('should parse logLevel ERROR', async () => {
      const markdownConfig = `---
logging:
  logLevel: ERROR
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.logLevel).toBe('ERROR');
    });

    it('should parse logLevel INFO', async () => {
      const markdownConfig = `---
logging:
  logLevel: INFO
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.logLevel).toBe('INFO');
    });

    it('should parse logLevel DEBUG', async () => {
      const markdownConfig = `---
logging:
  logLevel: DEBUG
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.logLevel).toBe('DEBUG');
    });

    it('should parse logLevel from snake_case', async () => {
      const markdownConfig = `---
logging:
  log_level: ERROR
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.logLevel).toBe('ERROR');
    });

    it('should handle invalid logLevel gracefully', async () => {
      const markdownConfig = `---
logging:
  logLevel: INVALID
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      // Should either throw or default to INFO
      const config = await loadConfig(testConfigPathMd);

      // Should default to INFO for invalid values
      expect(config.logging.logLevel).toBe('INFO');
    });

    it('should merge logLevel with other logging config', async () => {
      const markdownConfig = `---
logging:
  enabled: true
  logLevel: ERROR
  logFilePath: ".claude/logs/test.log"
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.enabled).toBe(true);
      expect(config.logging.logLevel).toBe('ERROR');
      expect(config.logging.logFilePath).toBe('.claude/logs/test.log');
    });
  });

  describe('Configuration - logging.useTimestampedLogs field', () => {
    it('should default useTimestampedLogs to false', async () => {
      const config = await loadConfig(join(testDir, 'nonexistent', 'config.md'));

      expect(config.logging.useTimestampedLogs).toBe(false);
    });

    it('should parse useTimestampedLogs true', async () => {
      const markdownConfig = `---
logging:
  useTimestampedLogs: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.useTimestampedLogs).toBe(true);
    });

    it('should parse useTimestampedLogs false', async () => {
      const markdownConfig = `---
logging:
  useTimestampedLogs: false
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.useTimestampedLogs).toBe(false);
    });

    it('should parse useTimestampedLogs from snake_case', async () => {
      const markdownConfig = `---
logging:
  use_timestamped_logs: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.useTimestampedLogs).toBe(true);
    });

    it('should merge useTimestampedLogs with other logging config', async () => {
      const markdownConfig = `---
logging:
  enabled: true
  useTimestampedLogs: true
  logLevel: DEBUG
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.logging.enabled).toBe(true);
      expect(config.logging.useTimestampedLogs).toBe(true);
      expect(config.logging.logLevel).toBe('DEBUG');
    });
  });

  describe('Configuration - all new fields together', () => {
    it('should parse all new fields in one config', async () => {
      const markdownConfig = `---
enabled: true
forceImprove: true
logging:
  enabled: true
  logLevel: ERROR
  useTimestampedLogs: true
  logFilePath: ".claude/logs/custom.log"
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.enabled).toBe(true);
      expect(config.forceImprove).toBe(true);
      expect(config.logging.enabled).toBe(true);
      expect(config.logging.logLevel).toBe('ERROR');
      expect(config.logging.useTimestampedLogs).toBe(true);
      expect(config.logging.logFilePath).toBe('.claude/logs/custom.log');
    });

    it('should use defaults for omitted new fields', async () => {
      const markdownConfig = `---
enabled: true
---`;

      writeFileSync(testConfigPathMd, markdownConfig);

      const config = await loadConfig(testConfigPathMd);

      expect(config.enabled).toBe(true);
      expect(config.forceImprove).toBe(false); // default
      expect(config.logging.logLevel).toBe('INFO'); // default
      expect(config.logging.useTimestampedLogs).toBe(false); // default
    });
  });

  describe('DEFAULT_CONFIG validation', () => {
    it('should have forceImprove in defaults', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('forceImprove');
      expect(DEFAULT_CONFIG.forceImprove).toBe(false);
    });

    it('should have logLevel in logging defaults', () => {
      expect(DEFAULT_CONFIG.logging).toHaveProperty('logLevel');
      expect(DEFAULT_CONFIG.logging.logLevel).toBe('INFO');
    });

    it('should have useTimestampedLogs in logging defaults', () => {
      expect(DEFAULT_CONFIG.logging).toHaveProperty('useTimestampedLogs');
      expect(DEFAULT_CONFIG.logging.useTimestampedLogs).toBe(false);
    });
  });
});

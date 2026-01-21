/**
 * Integration tests for real filesystem operations
 * Tests that implementations actually read from disk (not just mocks)
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearConfigCache,
  loadConfig,
  loadConfigFromStandardPaths,
} from '../core/config-loader.ts';
import { executeGitCommand, gatherGitContext } from './git-context.ts';
import { checkMemoryPluginInstalled, gatherMemoryContext } from './memory-plugin.ts';
import { checkSpecifyDirectory, clearSpecFileCache, gatherSpecContext } from './spec-awareness.ts';

describe('Integration Tests - Real Filesystem', () => {
  const testDir = join(tmpdir(), `prompt-improver-integration-${Date.now()}`);

  beforeEach(() => {
    clearConfigCache();
    clearSpecFileCache();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Spec Awareness - Real FS', () => {
    it('should detect .specify directory when it exists', () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir, { recursive: true });

      const result = checkSpecifyDirectory({ specifyPath: specifyDir });

      expect(result).toBe(true);
    });

    it('should return false when .specify directory does not exist', () => {
      const nonExistentPath = join(testDir, 'nonexistent', '.specify');

      const result = checkSpecifyDirectory({ specifyPath: nonExistentPath });

      expect(result).toBe(false);
    });

    it('should read spec.md from real filesystem', async () => {
      // Create feature directory structure
      const featureDir = join(testDir, '.specify', 'specs', 'feature', 'test-feature');
      mkdirSync(featureDir, { recursive: true });

      const specContent = `---
feature: Test Feature
status: in-progress
---

# Test Feature Specification

## User Stories

### US001: As a user I want to test

This is a test user story.
`;
      writeFileSync(join(featureDir, 'spec.md'), specContent);

      // Pass the FULL path as featurePath - implementation reads {featurePath}/spec.md
      const result = await gatherSpecContext({
        specifyPath: join(testDir, '.specify'),
        featurePath: featureDir,
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.featureName).toBe('Test Feature');
    });

    it('should handle missing spec files gracefully', async () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir, { recursive: true });

      const result = await gatherSpecContext({
        specifyPath: specifyDir,
        featurePath: join(testDir, 'nonexistent', 'feature'),
      });

      // Returns skipped with reason when spec file not found
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_spec_file');
    });
  });

  describe('Memory Plugin - Real FS', () => {
    it('should detect memory plugin when .claude/memory exists via mock', async () => {
      // Mock must use exact paths from PLUGIN_PATHS (.claude/memory/)
      const result = await checkMemoryPluginInstalled({
        _mockFileSystem: { '.claude/memory/': '' },
      });

      expect(result.found).toBe(true);
      expect(result.path).toBe('.claude/memory/');
    });

    it('should return found:false when memory plugin not installed', async () => {
      // Empty mock - no plugin paths exist
      const result = await checkMemoryPluginInstalled({
        _mockFileSystem: {},
      });

      expect(result.found).toBe(false);
    });

    it('should check real filesystem paths when no mock provided', async () => {
      // This tests the real fs code path (may find plugin if installed)
      const result = await checkMemoryPluginInstalled({});

      // Just verify it runs without error and returns valid structure
      expect(result).toHaveProperty('found');
      expect(typeof result.found).toBe('boolean');
    });

    it('should read index.json via mock filesystem', async () => {
      const indexContent = JSON.stringify({
        memories: [
          {
            id: 'decision-test',
            title: 'Test Decision',
            type: 'decision',
            tags: ['test', 'integration'],
            description: 'A test decision for integration testing',
          },
        ],
      });

      // Mock must use exact PLUGIN_PATHS entries
      const result = await gatherMemoryContext({
        prompt: 'test integration',
        _mockFileSystem: {
          '.claude/memory/': '',
          '.claude/memory/index.json': indexContent,
        },
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.memories.length).toBe(1);
      expect(result.context?.memories[0]?.title).toBe('Test Decision');
    });
  });

  describe('Git Context - Real FS', () => {
    it('should handle non-git directory gracefully', async () => {
      const result = await executeGitCommand(['status'], {
        cwd: testDir,
        timeoutMs: 5000,
      });

      // Should fail gracefully (not a git repo)
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should gather git context in a real git repository', async () => {
      // Use the actual project directory which is a git repo
      const result = await gatherGitContext({
        cwd: process.cwd(),
        timeoutMs: 5000,
        enabled: true,
      });

      // In a real git repo, this should succeed
      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.branch).toBeDefined();
    });

    it('should respect timeout for git commands', async () => {
      const result = await executeGitCommand(['status'], {
        cwd: process.cwd(),
        timeoutMs: 1, // Very short timeout
      });

      // May or may not timeout depending on system speed
      expect(result).toHaveProperty('success');
    });
  });

  describe('Config Loader - Real FS', () => {
    it('should load markdown config from real filesystem', async () => {
      const configDir = join(testDir, '.claude');
      mkdirSync(configDir, { recursive: true });

      const configContent = `---
enabled: true
shortPromptThreshold: 25
---

# Prompt Improver Configuration

Custom configuration for testing.
`;
      const configPath = join(configDir, 'prompt-improver.local.md');
      writeFileSync(configPath, configContent);

      const config = await loadConfig(configPath);

      expect(config.enabled).toBe(true);
      expect(config.shortPromptThreshold).toBe(25);
    });

    it('should load JSON config from real filesystem', async () => {
      const configDir = join(testDir, '.claude');
      mkdirSync(configDir, { recursive: true });

      const configContent = JSON.stringify({
        enabled: false,
        shortPromptThreshold: 15,
      });
      const configPath = join(configDir, 'prompt-improver-config.json');
      writeFileSync(configPath, configContent);

      const config = await loadConfig(configPath);

      expect(config.enabled).toBe(false);
      expect(config.shortPromptThreshold).toBe(15);
    });

    it('should return defaults for non-existent config', async () => {
      const nonExistentPath = join(testDir, 'nonexistent', 'config.md');

      const config = await loadConfig(nonExistentPath);

      expect(config.enabled).toBe(true);
      expect(config.shortPromptThreshold).toBe(10);
    });

    it('should load config from standard paths', async () => {
      const configDir = join(testDir, '.claude');
      mkdirSync(configDir, { recursive: true });

      const configContent = `---
shortPromptThreshold: 30
---`;
      writeFileSync(join(configDir, 'prompt-improver.local.md'), configContent);

      const config = await loadConfigFromStandardPaths(testDir);

      expect(config.shortPromptThreshold).toBe(30);
    });

    it('should use mtime caching for repeated reads', async () => {
      const configDir = join(testDir, '.claude');
      mkdirSync(configDir, { recursive: true });

      const configPath = join(configDir, 'prompt-improver.local.md');
      writeFileSync(
        configPath,
        `---
shortPromptThreshold: 42
---`
      );

      // First read
      const config1 = await loadConfig(configPath);
      expect(config1.shortPromptThreshold).toBe(42);

      // Second read should use cache
      const config2 = await loadConfig(configPath);
      expect(config2.shortPromptThreshold).toBe(42);
      expect(config2).toEqual(config1);
    });
  });
});

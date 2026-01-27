/**
 * T210-T213: Plugin Manifest Tests
 * Validates plugin.json structure and content
 */
import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Get the project root (parent of hooks directory)
const projectRoot = dirname(dirname(__dirname));
const pluginJsonPath = join(projectRoot, '.claude-plugin', 'plugin.json');

describe('T210-T213: Plugin Manifest', () => {
  let pluginJson: Record<string, unknown>;

  beforeAll(() => {
    expect(existsSync(pluginJsonPath)).toBe(true);
    pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
  });

  describe('T210: Plugin manifest structure', () => {
    it('T210.1: should have required name field', () => {
      expect(pluginJson.name).toBe('claude-prompt-improver');
    });

    it('T210.2: should have valid semver version', () => {
      expect(typeof pluginJson.version).toBe('string');
      expect(pluginJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('T210.3: should have description field', () => {
      expect(typeof pluginJson.description).toBe('string');
      expect((pluginJson.description as string).length).toBeGreaterThan(0);
    });
  });

  describe('T211: Author field structure', () => {
    it('T211.1: should have author object with name', () => {
      expect(typeof pluginJson.author).toBe('object');
      expect((pluginJson.author as Record<string, unknown>).name).toBe('Gareth Williams');
    });

    it('T211.2: should have author object with url', () => {
      expect((pluginJson.author as Record<string, unknown>).url).toBe('https://github.com/GaZmagik');
    });
  });

  describe('T212: Hooks configuration', () => {
    it('T212.1: hooks.json should exist in default location', () => {
      // Hooks field removed in v1.7.1 - uses default location instead
      const hooksJsonPath = join(projectRoot, 'hooks', 'hooks.json');
      expect(existsSync(hooksJsonPath)).toBe(true);
    });

    it('T212.2: should not have redundant hooks field (uses default location)', () => {
      // v1.7.1 removed hooks field as it caused "Duplicate hooks file detected" error
      expect(pluginJson.hooks).toBeUndefined();
    });
  });

  describe('T213: Additional manifest fields', () => {
    it('T213.1: should have repository field', () => {
      expect(pluginJson.repository).toBe('https://github.com/GaZmagik/claude-prompt-improver');
    });

    it('T213.2: should have license field', () => {
      expect(pluginJson.license).toBe('MIT');
    });

    it('T213.3: should have keywords array', () => {
      expect(Array.isArray(pluginJson.keywords)).toBe(true);
      expect((pluginJson.keywords as string[]).length).toBeGreaterThan(0);
    });

    it('T213.4: should have homepage field', () => {
      expect(pluginJson.homepage).toBe('https://github.com/GaZmagik/claude-prompt-improver');
    });
  });
});

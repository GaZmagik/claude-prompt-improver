/**
 * Resource Formatter Tests
 * Tests for language detection, speckit status, and XML formatting
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectLanguage,
  checkSpeckitStatus,
  formatResourcesXml,
  type ResourceContext,
} from './resource-formatter.ts';

describe('resource-formatter', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `resource-formatter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectLanguage', () => {
    it('detects TypeScript from tsconfig.json', () => {
      writeFileSync(join(testDir, 'tsconfig.json'), '{}');
      expect(detectLanguage(testDir)).toBe('typescript');
    });

    it('detects Rust from Cargo.toml', () => {
      writeFileSync(join(testDir, 'Cargo.toml'), '[package]');
      expect(detectLanguage(testDir)).toBe('rust');
    });

    it('detects Python from pyproject.toml', () => {
      writeFileSync(join(testDir, 'pyproject.toml'), '[project]');
      expect(detectLanguage(testDir)).toBe('python');
    });

    it('detects Node.js from package.json without tsconfig', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');
      expect(detectLanguage(testDir)).toBe('nodejs');
    });

    it('detects Go from go.mod', () => {
      writeFileSync(join(testDir, 'go.mod'), 'module example');
      expect(detectLanguage(testDir)).toBe('go');
    });

    it('returns null when no config files found', () => {
      expect(detectLanguage(testDir)).toBeNull();
    });

    it('prefers TypeScript over Node.js when both present', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');
      writeFileSync(join(testDir, 'tsconfig.json'), '{}');
      expect(detectLanguage(testDir)).toBe('typescript');
    });

    it('returns null for non-existent directory', () => {
      expect(detectLanguage('/nonexistent/path/surely')).toBeNull();
    });
  });

  describe('checkSpeckitStatus', () => {
    it('returns all false when .specify directory missing', () => {
      const status = checkSpeckitStatus(testDir);
      expect(status).toEqual({ hasSpec: false, hasPlan: false, hasTasks: false });
    });

    it('detects spec.md presence', () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir);
      writeFileSync(join(specifyDir, 'spec.md'), '# Spec');
      const status = checkSpeckitStatus(testDir);
      expect(status.hasSpec).toBe(true);
      expect(status.hasPlan).toBe(false);
      expect(status.hasTasks).toBe(false);
    });

    it('detects plan.md presence', () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir);
      writeFileSync(join(specifyDir, 'plan.md'), '# Plan');
      const status = checkSpeckitStatus(testDir);
      expect(status.hasSpec).toBe(false);
      expect(status.hasPlan).toBe(true);
      expect(status.hasTasks).toBe(false);
    });

    it('detects tasks.md presence', () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir);
      writeFileSync(join(specifyDir, 'tasks.md'), '# Tasks');
      const status = checkSpeckitStatus(testDir);
      expect(status.hasSpec).toBe(false);
      expect(status.hasPlan).toBe(false);
      expect(status.hasTasks).toBe(true);
    });

    it('detects all files when present', () => {
      const specifyDir = join(testDir, '.specify');
      mkdirSync(specifyDir);
      writeFileSync(join(specifyDir, 'spec.md'), '# Spec');
      writeFileSync(join(specifyDir, 'plan.md'), '# Plan');
      writeFileSync(join(specifyDir, 'tasks.md'), '# Tasks');
      const status = checkSpeckitStatus(testDir);
      expect(status).toEqual({ hasSpec: true, hasPlan: true, hasTasks: true });
    });

    it('returns all false for non-existent directory', () => {
      const status = checkSpeckitStatus('/nonexistent/path/surely');
      expect(status).toEqual({ hasSpec: false, hasPlan: false, hasTasks: false });
    });
  });

  describe('formatResourcesXml', () => {
    it('formats complete context with all resources', () => {
      const context: ResourceContext = {
        language: 'typescript',
        speckitStatus: { hasSpec: true, hasPlan: true, hasTasks: false },
        plugins: [
          { name: 'memory-plugin', version: '1.0.0', description: 'Memory management' },
          { name: 'speckit', version: '2.1.0', description: 'Specification toolkit' },
        ],
        mcpServers: [
          { name: 'context7', type: 'sse' },
          { name: 'calculator', type: 'stdio' },
        ],
      };

      const xml = formatResourcesXml(context);

      expect(xml).toContain('<project-context>');
      expect(xml).toContain('<language>typescript</language>');
      expect(xml).toContain('<speckit-status');
      expect(xml).toContain('spec="true"');
      expect(xml).toContain('plan="true"');
      expect(xml).toContain('tasks="false"');
      expect(xml).toContain('<plugins>');
      expect(xml).toContain('<plugin name="memory-plugin"');
      expect(xml).toContain('<mcp-servers>');
      expect(xml).toContain('<server name="context7"');
      expect(xml).toContain('</project-context>');
    });

    it('omits language section when null', () => {
      const context: ResourceContext = {
        language: null,
        speckitStatus: { hasSpec: false, hasPlan: false, hasTasks: false },
        plugins: [],
        mcpServers: [],
      };

      const xml = formatResourcesXml(context);
      expect(xml).not.toContain('<language>');
    });

    it('omits plugins section when empty', () => {
      const context: ResourceContext = {
        language: 'rust',
        speckitStatus: { hasSpec: false, hasPlan: false, hasTasks: false },
        plugins: [],
        mcpServers: [],
      };

      const xml = formatResourcesXml(context);
      expect(xml).not.toContain('<plugins>');
    });

    it('omits mcp-servers section when empty', () => {
      const context: ResourceContext = {
        language: 'python',
        speckitStatus: { hasSpec: true, hasPlan: false, hasTasks: false },
        plugins: [{ name: 'test', version: '1.0.0', description: 'Test plugin' }],
        mcpServers: [],
      };

      const xml = formatResourcesXml(context);
      expect(xml).not.toContain('<mcp-servers>');
    });

    it('escapes XML special characters in descriptions', () => {
      const context: ResourceContext = {
        language: null,
        speckitStatus: { hasSpec: false, hasPlan: false, hasTasks: false },
        plugins: [{ name: 'test', version: '1.0.0', description: 'Uses <tags> & "quotes"' }],
        mcpServers: [],
      };

      const xml = formatResourcesXml(context);
      expect(xml).toContain('&lt;tags&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;quotes&quot;');
    });

    it('returns minimal XML when all sections empty', () => {
      const context: ResourceContext = {
        language: null,
        speckitStatus: { hasSpec: false, hasPlan: false, hasTasks: false },
        plugins: [],
        mcpServers: [],
      };

      const xml = formatResourcesXml(context);
      expect(xml).toContain('<project-context>');
      expect(xml).toContain('<speckit-status');
      expect(xml).toContain('</project-context>');
      // Should be relatively short
      expect(xml.length).toBeLessThan(200);
    });
  });
});

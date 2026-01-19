/**
 * T132-T135: README.md documentation tests
 * T132: Test README.md exists and contains purpose in first paragraph
 * T133: Test README.md contains installation instructions
 * T134: Test README.md documents all configuration options
 * T135: Test README.md contains troubleshooting section
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..');
const README_PATH = join(PROJECT_ROOT, 'README.md');

describe('README.md Documentation', () => {
  let readmeContent: string;
  let readmeExists: boolean;

  beforeAll(() => {
    readmeExists = existsSync(README_PATH);
    if (readmeExists) {
      readmeContent = readFileSync(README_PATH, 'utf-8');
    }
  });

  describe('T132: README exists and contains purpose', () => {
    it('should exist at project root', () => {
      expect(readmeExists).toBe(true);
    });

    it('should contain purpose in first paragraph', () => {
      expect(readmeContent).toBeDefined();
      // First paragraph should mention prompt improvement/enhancement
      const firstParagraph = readmeContent.split('\n\n')[0] + '\n\n' + readmeContent.split('\n\n')[1];
      const hasPurpose =
        firstParagraph.toLowerCase().includes('prompt') &&
        (firstParagraph.toLowerCase().includes('improv') ||
          firstParagraph.toLowerCase().includes('enhanc') ||
          firstParagraph.toLowerCase().includes('plugin'));
      expect(hasPurpose).toBe(true);
    });

    it('should have a title as first line', () => {
      expect(readmeContent).toBeDefined();
      const firstLine = readmeContent.split('\n')[0] ?? '';
      expect(firstLine.startsWith('#')).toBe(true);
    });
  });

  describe('T133: README contains installation instructions', () => {
    it('should contain installation section', () => {
      expect(readmeContent).toBeDefined();
      const hasInstallation =
        readmeContent.toLowerCase().includes('## installation') ||
        readmeContent.toLowerCase().includes('### installation') ||
        readmeContent.toLowerCase().includes('# installation');
      expect(hasInstallation).toBe(true);
    });

    it('should mention bun or npm for dependencies', () => {
      expect(readmeContent).toBeDefined();
      const hasDeps =
        readmeContent.includes('bun install') ||
        readmeContent.includes('npm install') ||
        readmeContent.includes('bun add') ||
        readmeContent.includes('npm add');
      expect(hasDeps).toBe(true);
    });

    it('should mention plugin installation steps', () => {
      expect(readmeContent).toBeDefined();
      const hasPluginSteps =
        readmeContent.includes('.claude-plugin') ||
        readmeContent.includes('plugin.json') ||
        readmeContent.includes('hooks/');
      expect(hasPluginSteps).toBe(true);
    });
  });

  describe('T134: README documents configuration options', () => {
    it('should contain configuration section', () => {
      expect(readmeContent).toBeDefined();
      const hasConfig =
        readmeContent.toLowerCase().includes('## configuration') ||
        readmeContent.toLowerCase().includes('### configuration') ||
        readmeContent.toLowerCase().includes('# configuration');
      expect(hasConfig).toBe(true);
    });

    it('should document threshold settings', () => {
      expect(readmeContent).toBeDefined();
      const hasThresholds =
        readmeContent.toLowerCase().includes('threshold') ||
        readmeContent.toLowerCase().includes('token');
      expect(hasThresholds).toBe(true);
    });

    it('should document integration toggles', () => {
      expect(readmeContent).toBeDefined();
      const hasIntegrations =
        readmeContent.toLowerCase().includes('integration') ||
        readmeContent.toLowerCase().includes('git') ||
        readmeContent.toLowerCase().includes('lsp') ||
        readmeContent.toLowerCase().includes('memory');
      expect(hasIntegrations).toBe(true);
    });

    it('should show example configuration', () => {
      expect(readmeContent).toBeDefined();
      const hasExample =
        readmeContent.includes('```yaml') ||
        readmeContent.includes('```json') ||
        readmeContent.includes('prompt-improver.local.md') ||
        readmeContent.includes('prompt-improver-config');
      expect(hasExample).toBe(true);
    });
  });

  describe('T135: README contains troubleshooting section', () => {
    it('should contain troubleshooting section', () => {
      expect(readmeContent).toBeDefined();
      const hasTroubleshooting =
        readmeContent.toLowerCase().includes('## troubleshooting') ||
        readmeContent.toLowerCase().includes('### troubleshooting') ||
        readmeContent.toLowerCase().includes('# troubleshooting') ||
        readmeContent.toLowerCase().includes('## common issues') ||
        readmeContent.toLowerCase().includes('## faq');
      expect(hasTroubleshooting).toBe(true);
    });

    it('should address common issues', () => {
      expect(readmeContent).toBeDefined();
      // Should mention at least one common issue scenario
      const hasIssues =
        readmeContent.toLowerCase().includes('not working') ||
        readmeContent.toLowerCase().includes('bypass') ||
        readmeContent.toLowerCase().includes('timeout') ||
        readmeContent.toLowerCase().includes('error') ||
        readmeContent.toLowerCase().includes('issue');
      expect(hasIssues).toBe(true);
    });
  });
});

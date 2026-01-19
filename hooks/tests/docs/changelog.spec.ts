/**
 * T136: CHANGELOG.md documentation tests
 * T136: Test CHANGELOG.md exists and follows SemVer format
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..');
const CHANGELOG_PATH = join(PROJECT_ROOT, 'CHANGELOG.md');

describe('CHANGELOG.md Documentation', () => {
  let changelogContent: string;
  let changelogExists: boolean;

  beforeAll(() => {
    changelogExists = existsSync(CHANGELOG_PATH);
    if (changelogExists) {
      changelogContent = readFileSync(CHANGELOG_PATH, 'utf-8');
    }
  });

  describe('T136: CHANGELOG exists and follows SemVer', () => {
    it('should exist at project root', () => {
      expect(changelogExists).toBe(true);
    });

    it('should have a title', () => {
      expect(changelogContent).toBeDefined();
      const hasTitle =
        changelogContent.includes('# Changelog') ||
        changelogContent.includes('# CHANGELOG') ||
        changelogContent.includes('# Change Log');
      expect(hasTitle).toBe(true);
    });

    it('should contain at least one version entry', () => {
      expect(changelogContent).toBeDefined();
      // SemVer pattern: X.Y.Z or [X.Y.Z]
      const semverPattern = /\[?\d+\.\d+\.\d+\]?/;
      expect(semverPattern.test(changelogContent)).toBe(true);
    });

    it('should have version sections with dates', () => {
      expect(changelogContent).toBeDefined();
      // Common format: ## [1.0.0] - 2026-01-19 or ## 1.0.0 (2026-01-19)
      const hasDateFormat =
        changelogContent.includes('202') || // Year prefix
        changelogContent.includes('Unreleased');
      expect(hasDateFormat).toBe(true);
    });

    it('should categorise changes', () => {
      expect(changelogContent).toBeDefined();
      // Should have at least one of: Added, Changed, Fixed, Removed, etc.
      const hasCategories =
        changelogContent.includes('Added') ||
        changelogContent.includes('Changed') ||
        changelogContent.includes('Fixed') ||
        changelogContent.includes('Removed') ||
        changelogContent.includes('Features') ||
        changelogContent.includes('Bug Fixes');
      expect(hasCategories).toBe(true);
    });

    it('should follow Keep a Changelog format or similar', () => {
      expect(changelogContent).toBeDefined();
      // Should have hierarchical structure
      const hasStructure =
        changelogContent.includes('##') && changelogContent.includes('-');
      expect(hasStructure).toBe(true);
    });
  });
});

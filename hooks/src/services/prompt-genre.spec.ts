/**
 * Tests for prompt genre classification
 * Genres drive which guideline block and worked example the improver receives
 */
import { describe, expect, it } from 'bun:test';
import { classifyPromptGenre } from './prompt-genre.ts';

describe('classifyPromptGenre', () => {
  describe('fix genre', () => {
    it('classifies bug reports as fix', () => {
      expect(classifyPromptGenre('fix the login bug')).toBe('fix');
      expect(classifyPromptGenre('the export is broken after the last deploy')).toBe('fix');
      expect(classifyPromptGenre('app crashes when I open settings')).toBe('fix');
      expect(classifyPromptGenre('tests are failing on CI')).toBe('fix');
    });
  });

  describe('investigate genre', () => {
    it('classifies audits and code investigations as investigate', () => {
      expect(classifyPromptGenre('check all our api endpoints have auth')).toBe('investigate');
      expect(classifyPromptGenre('audit the codebase for hardcoded secrets')).toBe('investigate');
      expect(classifyPromptGenre('trace where team formations get picked')).toBe('investigate');
      expect(classifyPromptGenre('map every code path that builds a team sheet')).toBe(
        'investigate'
      );
      expect(classifyPromptGenre('go through the diff and flag anything dodgy')).toBe(
        'investigate'
      );
    });
  });

  describe('research genre', () => {
    it('classifies external research and fact-checking as research', () => {
      expect(classifyPromptGenre('find out if anyone still maintains left-pad-utils')).toBe(
        'research'
      );
      expect(classifyPromptGenre('research whether any public tool can parse replica_cmds')).toBe(
        'research'
      );
      expect(classifyPromptGenre('is left-pad deprecated? search the web')).toBe('research');
      expect(classifyPromptGenre('fact-check these claims from the external review')).toBe(
        'research'
      );
    });
  });

  describe('build genre', () => {
    it('classifies implementation work as build', () => {
      expect(classifyPromptGenre('add the invoice reconciliation tab to the dashboard')).toBe(
        'build'
      );
      expect(classifyPromptGenre('implement AI formation selection for clubs')).toBe('build');
      expect(classifyPromptGenre('migrate everything from moment to date-fns')).toBe('build');
      expect(classifyPromptGenre('refactor the ledger builder into modules')).toBe('build');
    });
  });

  describe('general genre', () => {
    it('falls back to general for conversational or unmatched prompts', () => {
      expect(classifyPromptGenre('what do you think about this approach?')).toBe('general');
      expect(classifyPromptGenre('thanks, that looks good')).toBe('general');
      expect(classifyPromptGenre('')).toBe('general');
    });
  });

  describe('mixed prompts', () => {
    it('prefers the genre with the strongest signal', () => {
      // "fix" + "bug" outweigh a single build keyword
      expect(classifyPromptGenre('add a test then fix the bug causing the crash')).toBe('fix');
    });
  });
});

/**
 * T023: Test constants are defined correctly
 */
import { describe, expect, it } from 'bun:test';
import {
  CLASSIFICATION_TIMEOUT_MS,
  COMPLEX_IMPROVEMENT_TIMEOUT_MS,
  COMPACTION_THRESHOLD_PERCENT,
  CONTEXT_GATHERING_TIMEOUT_MS,
  DEFAULT_LOG_FILE_PATH,
  HOOK_TIMEOUT_MS,
  SHORT_PROMPT_THRESHOLD_TOKENS,
  SIMPLE_IMPROVEMENT_TIMEOUT_MS,
  SKIP_TAG,
  XML_TAGS,
} from './constants.ts';

describe('Constants', () => {
  describe('Timeouts', () => {
    it('should define hook timeout of 90 seconds', () => {
      expect(HOOK_TIMEOUT_MS).toBe(90_000);
    });

    it('should define classification timeout of 5 seconds', () => {
      expect(CLASSIFICATION_TIMEOUT_MS).toBe(5_000);
    });

    it('should define simple improvement timeout of 30 seconds', () => {
      expect(SIMPLE_IMPROVEMENT_TIMEOUT_MS).toBe(30_000);
    });

    it('should define complex improvement timeout of 60 seconds', () => {
      expect(COMPLEX_IMPROVEMENT_TIMEOUT_MS).toBe(60_000);
    });

    it('should define context gathering timeout of 2 seconds', () => {
      expect(CONTEXT_GATHERING_TIMEOUT_MS).toBe(2_000);
    });
  });

  describe('Thresholds', () => {
    it('should define short prompt threshold of 10 tokens', () => {
      expect(SHORT_PROMPT_THRESHOLD_TOKENS).toBe(10);
    });

    it('should define compaction threshold of 5 percent', () => {
      expect(COMPACTION_THRESHOLD_PERCENT).toBe(5);
    });
  });

  describe('Tags and Markers', () => {
    it('should define skip tag as #skip', () => {
      expect(SKIP_TAG).toBe('#skip');
    });

    it('should define all valid XML tags', () => {
      expect(XML_TAGS).toContain('task');
      expect(XML_TAGS).toContain('context');
      expect(XML_TAGS).toContain('constraints');
      expect(XML_TAGS).toContain('output_format');
      expect(XML_TAGS).toContain('examples');
      expect(XML_TAGS).toHaveLength(5);
    });
  });

  describe('Paths', () => {
    it('should define default log file path', () => {
      expect(DEFAULT_LOG_FILE_PATH).toBe('.claude/logs/prompt-improver-latest.log');
    });
  });
});

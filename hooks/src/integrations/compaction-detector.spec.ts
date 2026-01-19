/**
 * T120-T122: Compaction detector tests
 * T120: Test compaction detector calculates available context percentage
 * T121: Test compaction detector skips processing when <5% available
 * T122: Test compaction detector parses context_usage from stdin
 */
import { describe, expect, it } from 'bun:test';
import {
  calculateAvailableContext,
  parseContextUsage,
  shouldSkipProcessing,
  type ContextUsage,
} from './compaction-detector.ts';

describe('Compaction Detector', () => {
  describe('T120: calculateAvailableContext - calculates available percentage', () => {
    it('should calculate percentage of available context', () => {
      const usage: ContextUsage = {
        used: 50000,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(50);
    });

    it('should return 0 when fully used', () => {
      const usage: ContextUsage = {
        used: 100000,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(0);
    });

    it('should return 100 when nothing used', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(100);
    });

    it('should handle edge case of zero total', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 0,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBe(0);
    });

    it('should round to reasonable precision', () => {
      const usage: ContextUsage = {
        used: 33333,
        total: 100000,
      };

      const available = calculateAvailableContext(usage);

      expect(available).toBeCloseTo(66.67, 1);
    });
  });

  describe('T121: shouldSkipProcessing - skips when <5% available', () => {
    it('should skip when less than 5% available', () => {
      const usage: ContextUsage = {
        used: 96000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(true);
    });

    it('should not skip when exactly 5% available', () => {
      const usage: ContextUsage = {
        used: 95000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(false);
    });

    it('should not skip when more than 5% available', () => {
      const usage: ContextUsage = {
        used: 50000,
        total: 100000,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(false);
    });

    it('should skip when total is zero', () => {
      const usage: ContextUsage = {
        used: 0,
        total: 0,
      };

      const shouldSkip = shouldSkipProcessing(usage);

      expect(shouldSkip).toBe(true);
    });

    it('should accept custom threshold', () => {
      const usage: ContextUsage = {
        used: 85000,
        total: 100000,
      };

      // Default threshold (5%) - should not skip
      expect(shouldSkipProcessing(usage)).toBe(false);

      // Custom threshold (20%) - should skip
      expect(shouldSkipProcessing(usage, 20)).toBe(true);
    });
  });

  describe('T122: parseContextUsage - parses context_usage from stdin', () => {
    it('should parse context_usage from hook stdin', () => {
      const stdin = {
        context_usage: {
          used: 75000,
          total: 200000,
        },
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeDefined();
      expect(usage?.used).toBe(75000);
      expect(usage?.total).toBe(200000);
    });

    it('should return undefined when context_usage missing', () => {
      const stdin = {
        prompt: 'some prompt',
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeUndefined();
    });

    it('should return undefined when stdin is null', () => {
      const usage = parseContextUsage(null);

      expect(usage).toBeUndefined();
    });

    it('should return undefined when context_usage is malformed', () => {
      const stdin = {
        context_usage: {
          used: 'not a number',
        },
      };

      const usage = parseContextUsage(stdin);

      expect(usage).toBeUndefined();
    });

    it('should handle nested context_usage structure', () => {
      const stdin = {
        session: {
          context_usage: {
            used: 50000,
            total: 100000,
          },
        },
      };

      const usage = parseContextUsage(stdin);

      // Should still find it
      expect(usage).toBeDefined();
    });
  });
});

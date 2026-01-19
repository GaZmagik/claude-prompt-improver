/**
 * Compaction detector for detecting low context availability
 * Used to skip processing when context is nearly exhausted (pre-compaction)
 */
import { COMPACTION_THRESHOLD_PERCENT } from '../core/constants.ts';

/**
 * Context usage information from Claude Code
 */
export interface ContextUsage {
  readonly used: number;
  readonly total: number;
}

/**
 * Calculates available context percentage
 * @returns Percentage of context still available (0-100)
 */
export function calculateAvailableContext(usage: ContextUsage): number {
  if (usage.total === 0) {
    return 0;
  }

  const available = ((usage.total - usage.used) / usage.total) * 100;
  return Math.round(available * 100) / 100; // Round to 2 decimal places
}

/**
 * Determines if processing should be skipped due to low context
 * @param usage Context usage information
 * @param threshold Minimum available percentage (default: 5%)
 * @returns true if context is below threshold and processing should skip
 */
export function shouldSkipProcessing(
  usage: ContextUsage,
  threshold: number = COMPACTION_THRESHOLD_PERCENT
): boolean {
  if (usage.total === 0) {
    return true;
  }

  const available = calculateAvailableContext(usage);
  return available < threshold;
}

/**
 * Parses context_usage from hook stdin
 * Handles both top-level and nested structures
 * @param stdin Raw stdin object from hook
 * @returns ContextUsage if valid, undefined otherwise
 */
export function parseContextUsage(stdin: unknown): ContextUsage | undefined {
  if (!stdin || typeof stdin !== 'object') {
    return undefined;
  }

  const obj = stdin as Record<string, unknown>;

  // Check for direct context_usage
  if (obj.context_usage && typeof obj.context_usage === 'object') {
    const contextUsage = obj.context_usage as Record<string, unknown>;
    if (
      typeof contextUsage.used === 'number' &&
      typeof contextUsage.total === 'number'
    ) {
      return {
        used: contextUsage.used,
        total: contextUsage.total,
      };
    }
  }

  // Check for nested session.context_usage
  if (obj.session && typeof obj.session === 'object') {
    const session = obj.session as Record<string, unknown>;
    if (session.context_usage && typeof session.context_usage === 'object') {
      const contextUsage = session.context_usage as Record<string, unknown>;
      if (
        typeof contextUsage.used === 'number' &&
        typeof contextUsage.total === 'number'
      ) {
        return {
          used: contextUsage.used,
          total: contextUsage.total,
        };
      }
    }
  }

  return undefined;
}

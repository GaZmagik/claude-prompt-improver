import { isShortPrompt } from '../utils/token-counter.ts';
import { COMPACTION_THRESHOLD_PERCENT, SKIP_TAG } from './constants.ts';
/**
 * Bypass detector for efficient prompt processing
 * Detects conditions where prompt improvement should be skipped
 */
import type { BypassReason } from './types.ts';

/**
 * Input for bypass detection
 */
export interface BypassCheckInput {
  readonly prompt: string;
  readonly sessionId: string;
  readonly permissionMode?: string;
  readonly pluginDisabled?: boolean;
  readonly forceImprove?: boolean;
  readonly shortPromptThreshold?: number;
  readonly contextUsage?: {
    readonly used: number;
    readonly max: number;
  };
}

/**
 * Result of bypass detection
 */
export interface BypassCheckResult {
  readonly shouldBypass: boolean;
  readonly reason?: BypassReason;
  /** Prompt with bypass tags removed (e.g., #skip removed) */
  readonly cleanedPrompt?: string;
}

/**
 * Removes #skip tag from prompt and returns cleaned version
 */
function removeSkipTags(prompt: string): string {
  // Remove all occurrences of #skip (case-insensitive, with surrounding whitespace)
  return prompt.replace(new RegExp(SKIP_TAG, 'gi'), '').replace(/\s+/g, ' ').trim();
}

/**
 * Checks if prompt contains the skip tag
 */
function hasSkipTag(prompt: string): boolean {
  return prompt.toLowerCase().includes(SKIP_TAG.toLowerCase());
}

/**
 * Detects if prompt is an improvement request (recursion prevention)
 * The hook spawns Claude CLI with an improvement prompt - if that triggers
 * the hook again, we get infinite recursion with exponential XML escaping.
 */
function isImprovementPrompt(prompt: string): boolean {
  // Check for the improvement prompt template signature
  return prompt.startsWith('You are improving a user prompt') ||
    prompt.includes('<original_prompt>');
}

/**
 * Calculates available context percentage
 */
function getAvailableContextPercent(contextUsage: { used: number; max: number }): number {
  if (contextUsage.max <= 0) return 100;
  const usedPercent = (contextUsage.used / contextUsage.max) * 100;
  return 100 - usedPercent;
}

/**
 * Detects if a prompt should bypass improvement processing
 *
 * Priority order (first match wins):
 * 0. forceImprove - Override all checks except plugin_disabled
 * 1. plugin_disabled - Plugin is disabled in configuration (cannot be overridden)
 * 2. forked_session - Running in forked session (recursion prevention)
 * 2b. improvement_prompt - Prompt is our own improvement template (recursion prevention)
 * 3. low_context - Less than 5% context remaining
 * 4. skip_tag - Prompt contains #skip tag
 * 5. short_prompt - Prompt is ≤10 tokens
 */
export function detectBypass(input: BypassCheckInput): BypassCheckResult {
  const { prompt, permissionMode, pluginDisabled, forceImprove, shortPromptThreshold, contextUsage } = input;

  // Priority 0: Force improve bypasses ALL checks except plugin_disabled
  if (forceImprove === true && pluginDisabled !== true) {
    return {
      shouldBypass: false,
    };
  }

  // Priority 1: Plugin disabled (absolute priority, cannot be overridden)
  if (pluginDisabled === true) {
    return {
      shouldBypass: true,
      reason: 'plugin_disabled',
    };
  }

  // Priority 2: Forked session (recursion prevention)
  if (permissionMode === 'fork') {
    return {
      shouldBypass: true,
      reason: 'forked_session',
    };
  }

  // Priority 2b: Improvement prompt recursion prevention
  // When the hook spawns `claude --print` to improve a prompt, that subprocess
  // also triggers UserPromptSubmit hooks. Detect and skip our own improvement prompts.
  if (isImprovementPrompt(prompt)) {
    return {
      shouldBypass: true,
      reason: 'forked_session', // Reuse existing reason - semantically same concept
    };
  }

  // Priority 3: Low context (near compaction)
  if (contextUsage) {
    const availablePercent = getAvailableContextPercent(contextUsage);
    if (availablePercent <= COMPACTION_THRESHOLD_PERCENT) {
      return {
        shouldBypass: true,
        reason: 'low_context',
      };
    }
  }

  // Priority 4: Skip tag
  if (hasSkipTag(prompt)) {
    return {
      shouldBypass: true,
      reason: 'skip_tag',
      cleanedPrompt: removeSkipTags(prompt),
    };
  }

  // Priority 5: Short prompt
  if (isShortPrompt(prompt, shortPromptThreshold)) {
    return {
      shouldBypass: true,
      reason: 'short_prompt',
    };
  }

  // No bypass condition met
  return {
    shouldBypass: false,
  };
}

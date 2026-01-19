/**
 * Constants for Claude Prompt Improver Plugin
 * Timeouts, thresholds, and configuration defaults
 */
import type { XmlTag } from './types.ts';

// ============================================================================
// Timeouts (milliseconds)
// ============================================================================

/** Total hook timeout - must complete within this time (90 seconds) */
export const HOOK_TIMEOUT_MS = 90_000;

/** Classification API call timeout (5 seconds) */
export const CLASSIFICATION_TIMEOUT_MS = 5_000;

/** Simple prompt improvement timeout using Haiku (30 seconds) */
export const SIMPLE_IMPROVEMENT_TIMEOUT_MS = 30_000;

/** Complex prompt improvement timeout using Sonnet (60 seconds) */
export const COMPLEX_IMPROVEMENT_TIMEOUT_MS = 60_000;

/** Session fork timeout for gathering context from forked session (10 seconds) */
export const SESSION_FORK_TIMEOUT_MS = 10_000;

/** Per-source context gathering timeout (2 seconds) */
export const CONTEXT_GATHERING_TIMEOUT_MS = 2_000;

/** Git command execution timeout (2 seconds) */
export const GIT_COMMAND_TIMEOUT_MS = 2_000;

// ============================================================================
// Thresholds
// ============================================================================

/** Prompts with ≤ this many tokens are bypassed (whitespace-split heuristic) */
export const SHORT_PROMPT_THRESHOLD_TOKENS = 10;

/** If context availability < this %, bypass to preserve resources */
export const COMPACTION_THRESHOLD_PERCENT = 5;

// ============================================================================
// Tags and Markers
// ============================================================================

/** Tag users can add to explicitly skip improvement */
export const SKIP_TAG = '#skip';

/** Valid XML tags for structured prompts */
export const XML_TAGS: readonly XmlTag[] = [
  'task',
  'context',
  'constraints',
  'output_format',
  'examples',
] as const;

// ============================================================================
// Paths
// ============================================================================

/** Default log file path relative to working directory */
export const DEFAULT_LOG_FILE_PATH = '.claude/logs/prompt-improver-latest.log';

/** Config file path relative to home directory */
export const CONFIG_FILE_NAME = 'prompt-improver-config.json';

// ============================================================================
// Models
// ============================================================================

/** Model used for classification (always Haiku for cost-effectiveness) */
export const CLASSIFICATION_MODEL = 'haiku' as const;

/** Model used for simple improvements */
export const SIMPLE_IMPROVEMENT_MODEL = 'haiku' as const;

/** Model used for complex improvements */
export const COMPLEX_IMPROVEMENT_MODEL = 'sonnet' as const;

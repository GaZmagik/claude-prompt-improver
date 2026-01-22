/**
 * Compaction detector for detecting low context availability
 * Used to skip processing when context is nearly exhausted (pre-compaction)
 */
import { existsSync } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { COMPACTION_THRESHOLD_PERCENT } from '../core/constants.ts';

// ============================================================================
// Constants
// ============================================================================

/** Claude's context window size in tokens (200K) */
export const CLAUDE_CONTEXT_WINDOW_TOKENS = 200_000;

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
    if (typeof contextUsage.used === 'number' && typeof contextUsage.total === 'number') {
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
      if (typeof contextUsage.used === 'number' && typeof contextUsage.total === 'number') {
        return {
          used: contextUsage.used,
          total: contextUsage.total,
        };
      }
    }
  }

  return undefined;
}

// ============================================================================
// Transcript-based context calculation
// ============================================================================

/**
 * Token usage extracted from a transcript message
 */
interface MessageTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
}

/**
 * Result of calculating context usage from transcript
 */
export interface TranscriptContextUsage {
  readonly used: number;
  readonly total: number;
  readonly messageCount: number;
  readonly source: 'transcript';
}

/**
 * Extracts token usage from a single transcript line (assistant message)
 * @param line Raw JSON line from transcript
 * @returns Token usage if extractable, undefined otherwise
 */
export function extractTokenUsageFromLine(line: string): MessageTokenUsage | undefined {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;

    // Only assistant messages have usage data
    if (parsed.type !== 'assistant') {
      return undefined;
    }

    const message = parsed.message as Record<string, unknown> | undefined;
    if (!message) {
      return undefined;
    }

    const usage = message.usage as Record<string, unknown> | undefined;
    if (!usage) {
      return undefined;
    }

    // Extract token counts (default to 0 if missing)
    const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
    const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;
    const cacheCreationTokens = typeof usage.cache_creation_input_tokens === 'number'
      ? usage.cache_creation_input_tokens : 0;
    const cacheReadTokens = typeof usage.cache_read_input_tokens === 'number'
      ? usage.cache_read_input_tokens : 0;

    return {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
    };
  } catch (error) {
    // Invalid JSON line - skip and continue parsing
    // Debug logging available via DEBUG env var for troubleshooting
    if (process.env.DEBUG) {
      console.error(`[compaction-detector] Failed to parse transcript line: ${error}`);
    }
    return undefined;
  }
}

/**
 * Autocompact buffer percentage (22.5% of context window)
 *
 * When autocompact is enabled, Claude Code reserves this portion of the context
 * window for automatic compaction operations. This ensures there's always room
 * for the compaction summary without hitting hard token limits.
 *
 * Calculation: 200K total × (1 - 0.225) = 155K usable tokens
 *
 * Source: Observed from Claude Code statusline behaviour and ~/.claude.json
 * autoCompactEnabled setting. The 22.5% value matches the statusline's
 * context percentage calculation in ~/.claude/statusline/lib/context-window.ts
 */
export const AUTOCOMPACT_BUFFER_PERCENT = 0.225;

/**
 * Calculate usable context window accounting for autocompact buffer
 * @param totalWindow Total context window size
 * @param autocompactEnabled Whether autocompact is enabled (default: true)
 * @returns Usable context window size
 */
export function getUsableContextWindow(
  totalWindow: number = CLAUDE_CONTEXT_WINDOW_TOKENS,
  autocompactEnabled: boolean = true
): number {
  if (!autocompactEnabled) {
    return totalWindow;
  }
  // Deduct 22.5% buffer for autocompact
  return Math.round(totalWindow * (1 - AUTOCOMPACT_BUFFER_PERCENT));
}

/**
 * Calculates context usage by parsing the session transcript file
 * Uses the LAST assistant message's input_tokens as the current context size
 * (each API call's input_tokens represents the full conversation context)
 *
 * @param transcriptPath Path to the .jsonl transcript file
 * @param contextWindow Total context window size (default: 200K)
 * @param autocompactEnabled Whether to account for autocompact buffer (default: true)
 * @returns Context usage calculated from transcript, or undefined if unavailable
 */
export async function calculateContextFromTranscript(
  transcriptPath: string,
  contextWindow: number = CLAUDE_CONTEXT_WINDOW_TOKENS,
  autocompactEnabled: boolean = true
): Promise<TranscriptContextUsage | undefined> {
  // Check file exists
  if (!existsSync(transcriptPath)) {
    return undefined;
  }

  let lastUsage: MessageTokenUsage | undefined;
  let messageCount = 0;

  try {
    // Stream the file line by line to handle large transcripts
    const fileStream = createReadStream(transcriptPath, { encoding: 'utf-8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Handle Windows line endings
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      const usage = extractTokenUsageFromLine(line);
      if (usage) {
        lastUsage = usage;
        messageCount++;
      }
    }

    // No assistant messages found
    if (!lastUsage) {
      return undefined;
    }

    // The last message's token counts represent current context size:
    // - inputTokens: Fresh tokens sent to API (not from cache)
    // - outputTokens: Assistant's response (will be in context for next turn)
    // - cacheCreationTokens: Tokens written to cache (new context)
    // - cacheReadTokens: Tokens served from cache (still part of context window)
    //
    // Note: cacheReadTokens ARE included because they represent context that exists
    // in the conversation - they're just served from cache rather than reprocessed.
    // The total represents what Claude "sees" as context, regardless of cache source.
    const currentContextSize =
      lastUsage.inputTokens +
      lastUsage.outputTokens +
      lastUsage.cacheCreationTokens +
      lastUsage.cacheReadTokens;

    // Calculate usable context (accounting for autocompact buffer)
    const usableWindow = getUsableContextWindow(contextWindow, autocompactEnabled);

    return {
      used: currentContextSize,
      total: usableWindow,
      messageCount,
      source: 'transcript',
    };
  } catch {
    // File read error - return undefined
    return undefined;
  }
}

/**
 * Convenience function to check if context is low based on transcript
 *
 * @param transcriptPath Path to the .jsonl transcript file
 * @param threshold Minimum available percentage (default: 5%)
 * @returns true if context is below threshold, false otherwise, undefined if can't determine
 */
export async function isContextLowFromTranscript(
  transcriptPath: string,
  threshold: number = COMPACTION_THRESHOLD_PERCENT
): Promise<boolean | undefined> {
  const usage = await calculateContextFromTranscript(transcriptPath);
  if (!usage) {
    return undefined;
  }

  return shouldSkipProcessing(usage, threshold);
}

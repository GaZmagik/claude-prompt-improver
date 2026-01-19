/**
 * Logger utility for Claude Prompt Improver Plugin
 * Provides JSON logging to file with JSONL format
 * Uses async fire-and-forget pattern to avoid blocking the event loop
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  BypassReason,
  ClassificationLevel,
  ClaudeModel,
  ContextSource,
  LogEntry,
} from '../core/types.ts';

/**
 * Input for creating a log entry (without timestamp which is auto-generated)
 */
export interface LogEntryInput {
  readonly originalPrompt: string;
  readonly improvedPrompt: string | null;
  readonly classification: ClassificationLevel;
  readonly bypassReason: BypassReason | null;
  readonly modelUsed: ClaudeModel | null;
  readonly totalLatency: number;
  readonly contextSources: readonly ContextSource[];
  readonly conversationId: string;
}

/**
 * Creates a LogEntry with current timestamp
 */
export function createLogEntry(input: LogEntryInput): LogEntry {
  return {
    timestamp: new Date(),
    originalPrompt: input.originalPrompt,
    improvedPrompt: input.improvedPrompt,
    classification: input.classification,
    bypassReason: input.bypassReason,
    modelUsed: input.modelUsed,
    totalLatency: input.totalLatency,
    contextSources: input.contextSources,
    conversationId: input.conversationId,
  };
}

/**
 * Formats a LogEntry as a JSON string for logging
 */
export function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp.toISOString(),
    originalPrompt: entry.originalPrompt,
    improvedPrompt: entry.improvedPrompt,
    classification: entry.classification,
    bypassReason: entry.bypassReason,
    modelUsed: entry.modelUsed,
    totalLatency: entry.totalLatency,
    contextSources: entry.contextSources,
    conversationId: entry.conversationId,
  });
}

/**
 * Writes a log entry to the specified file path (JSONL format)
 * Creates parent directories if they don't exist
 * Uses fire-and-forget async pattern to avoid blocking the event loop
 */
export function writeLogEntry(entry: LogEntry, filePath: string): void {
  // Fire-and-forget async logging - don't await to avoid blocking
  void writeLogEntryAsync(entry, filePath);
}

/**
 * Async implementation of log writing
 * Errors are silently ignored to prevent logging from affecting hook execution
 * Exported for testing - production code should use writeLogEntry (fire-and-forget)
 */
export async function writeLogEntryAsync(entry: LogEntry, filePath: string): Promise<void> {
  try {
    const dir = dirname(filePath);

    // Create parent directories if needed (sync check, async create)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const json = formatLogEntry(entry);
    await appendFile(filePath, json + '\n', 'utf-8');
  } catch {
    // Silently ignore logging errors - logging should never break the hook
  }
}

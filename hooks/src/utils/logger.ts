/**
 * Logger utility for Claude Prompt Improver Plugin
 * Provides JSON logging to file with JSONL format
 * Uses async fire-and-forget pattern to avoid blocking the event loop
 */
import { access, appendFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type {
  BypassReason,
  ClaudeModel,
  ContextSource,
  LogEntry,
  LogLevel,
} from '../core/types.ts';

/**
 * Input for creating a log entry (without timestamp which is auto-generated)
 */
export interface LogEntryInput {
  readonly originalPrompt: string;
  readonly improvedPrompt: string | null;
  readonly bypassReason: BypassReason | null;
  readonly modelUsed: ClaudeModel | null;
  readonly totalLatency: number;
  readonly improvementLatency?: number;
  readonly contextSources: readonly ContextSource[];
  readonly conversationId: string;
  readonly level: LogLevel;
  readonly phase: 'bypass' | 'improve' | 'complete';
  readonly error?: string;
}

/**
 * Security: Create prompt preview (50 chars max, no newlines)
 * Never log full prompts to protect user privacy
 */
export function createPromptPreview(prompt: string): string {
  return `${prompt.slice(0, 50).replace(/\n/g, ' ').trim()}...`;
}

/**
 * Generate timestamped log file path
 */
export function generateLogFilePath(basePath: string, useTimestamp: boolean): string {
  if (!useTimestamp) return basePath;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dir = dirname(basePath);
  const ext = basePath.endsWith('.log') ? '.log' : '';
  const base = basename(basePath, ext);

  return join(dir, `${base}-${timestamp}${ext}`);
}

/**
 * Check if log entry should be written based on log level
 */
export function shouldLog(entryLevel: LogLevel, configLevel: LogLevel): boolean {
  const levels: Record<LogLevel, number> = { ERROR: 0, INFO: 1, DEBUG: 2 };
  return levels[entryLevel] <= levels[configLevel];
}

/**
 * Creates a LogEntry with current timestamp
 */
export function createLogEntry(input: LogEntryInput): LogEntry {
  return {
    timestamp: new Date(),
    level: input.level,
    phase: input.phase,
    promptPreview: createPromptPreview(input.originalPrompt),
    improvedPrompt: input.improvedPrompt ? createPromptPreview(input.improvedPrompt) : null,
    bypassReason: input.bypassReason,
    modelUsed: input.modelUsed,
    totalLatency: input.totalLatency,
    contextSources: input.contextSources,
    conversationId: input.conversationId,
    ...(input.improvementLatency !== undefined && { improvementLatency: input.improvementLatency }),
    ...(input.error !== undefined && { error: input.error }),
  };
}

/**
 * Formats a LogEntry as a JSON string for logging
 */
export function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    phase: entry.phase,
    promptPreview: entry.promptPreview,
    improvedPrompt: entry.improvedPrompt,
    bypassReason: entry.bypassReason,
    modelUsed: entry.modelUsed,
    totalLatency: entry.totalLatency,
    ...(entry.improvementLatency !== undefined && { improvementLatency: entry.improvementLatency }),
    contextSources: entry.contextSources,
    conversationId: entry.conversationId,
    ...(entry.error !== undefined && { error: entry.error }),
  });
}

/**
 * Writes a log entry to the specified file path (JSONL format)
 * Creates parent directories if they don't exist
 * Uses fire-and-forget async pattern to avoid blocking the event loop
 */
export function writeLogEntry(
  entry: LogEntry,
  filePath: string,
  configLevel: LogLevel = 'INFO'
): void {
  // Check log level filtering before writing
  if (!shouldLog(entry.level, configLevel)) {
    return;
  }

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

    // Create parent directories if needed (fully async)
    try {
      await access(dir);
    } catch {
      await mkdir(dir, { recursive: true });
    }

    const json = formatLogEntry(entry);
    await appendFile(filePath, `${json}\n`, 'utf-8');
  } catch {
    // Silently ignore logging errors - logging should never break the hook
  }
}

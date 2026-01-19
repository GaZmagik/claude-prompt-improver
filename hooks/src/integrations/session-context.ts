/**
 * Session context for gathering context from forked Claude sessions
 * Handles session forking, detection of forked sessions, and timeout management
 */
import { SESSION_FORK_TIMEOUT_MS } from '../core/constants.ts';

/**
 * Session context from forked session
 */
export interface SessionContext {
  readonly output: string;
  readonly forked: boolean;
}

/**
 * Command execution result
 */
export interface CommandResult {
  readonly success: boolean;
  readonly output: string;
  readonly error?: string;
}

/**
 * Options for gathering session context
 */
export interface SessionContextOptions {
  readonly enabled?: boolean;
  readonly stdin?: Record<string, unknown>;
  readonly prompt?: string;
  /** For testing - mock command execution */
  readonly _mockCommandExecution?: (cmd: string) => Promise<CommandResult | null>;
}

/**
 * Result of gathering session context
 */
export interface SessionContextResult {
  readonly success: boolean;
  readonly context?: SessionContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'disabled' | 'already_forked' | 'timeout';
}

/**
 * Detects if current session is a forked session
 * Forked sessions have permission_mode set to 'none'
 * @param stdin Hook stdin object
 * @returns true if running in a forked session
 */
export function detectForkedSession(stdin: unknown): boolean {
  if (!stdin || typeof stdin !== 'object') {
    return false;
  }

  const obj = stdin as Record<string, unknown>;
  return obj.permission_mode === 'none';
}

/**
 * Alias for detectForkedSession for clarity
 */
export function isForkedSession(stdin: unknown): boolean {
  return detectForkedSession(stdin);
}

/**
 * Gathers session context by forking a Claude session
 * @param options Configuration options
 * @returns Session context result
 */
export async function gatherSessionContext(
  options: SessionContextOptions = {}
): Promise<SessionContextResult> {
  const { enabled = true, stdin, prompt = '', _mockCommandExecution } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  // Check if already in forked session (prevent infinite recursion)
  if (stdin && detectForkedSession(stdin)) {
    return {
      success: false,
      skipped: true,
      skipReason: 'already_forked',
    };
  }

  // Execute fork command
  const command = buildForkCommand(prompt);

  if (_mockCommandExecution) {
    const result = await _mockCommandExecution(command);

    // null result indicates timeout
    if (result === null) {
      return {
        success: false,
        skipped: true,
        skipReason: 'timeout',
      };
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Command failed',
      };
    }

    return {
      success: true,
      context: {
        output: result.output,
        forked: true,
      },
    };
  }

  // Real implementation would use Bun.spawn with timeout
  // For now, return a placeholder
  return {
    success: false,
    skipped: true,
    skipReason: 'timeout',
  };
}

/**
 * Builds the fork session command
 * @param prompt The prompt to process
 * @returns Command string
 */
function buildForkCommand(prompt: string): string {
  // Basic command structure for forking session
  return `claude --fork-session --timeout ${SESSION_FORK_TIMEOUT_MS} --prompt "${prompt.replace(/"/g, '\\"')}"`;
}

/**
 * Formats session context for injection into improvement prompt
 * @param context Session context
 * @returns Formatted string, empty if no meaningful output
 */
export function formatSessionContext(context: SessionContext): string {
  if (!context.output || context.output.trim() === '') {
    return '';
  }

  return context.output;
}

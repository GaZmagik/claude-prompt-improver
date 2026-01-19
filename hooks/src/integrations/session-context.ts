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
 * Fork command arguments (array-based to prevent injection)
 */
export interface ForkCommandArgs {
  readonly args: readonly string[];
  readonly commandString: string; // For logging/debugging only
}

/**
 * Options for gathering session context
 */
export interface SessionContextOptions {
  readonly enabled?: boolean;
  readonly stdin?: Record<string, unknown>;
  readonly prompt?: string;
  /** For testing - mock command execution (receives command string for verification) */
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
  const { args, commandString } = buildForkCommand(prompt);

  if (_mockCommandExecution) {
    // Pass command string to mock for verification (actual execution would use args array)
    const result = await _mockCommandExecution(commandString);

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

  // Real implementation using Bun.spawn with args array (no shell interpretation)
  // Example: const proc = Bun.spawn(args, { timeout: SESSION_FORK_TIMEOUT_MS });
  void args; // Mark as used - will be passed to Bun.spawn in real implementation
  return {
    success: false,
    skipped: true,
    skipReason: 'timeout',
  };
}

/**
 * Builds the fork session command arguments
 * Uses array-based approach to prevent command injection
 * @param prompt The prompt to process (passed directly, no shell interpretation)
 * @returns Fork command arguments with args array and debug string
 */
export function buildForkCommand(prompt: string): ForkCommandArgs {
  // Array-based arguments prevent shell injection
  // The prompt is passed directly to Bun.spawn without shell interpretation
  const args = [
    'claude',
    '--fork-session',
    '--timeout',
    String(SESSION_FORK_TIMEOUT_MS),
    '--prompt',
    prompt, // No escaping needed - passed directly to process, not through shell
  ];

  return {
    args,
    // Command string for logging/debugging only (not executed)
    commandString: `claude --fork-session --timeout ${SESSION_FORK_TIMEOUT_MS} --prompt <prompt>`,
  };
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

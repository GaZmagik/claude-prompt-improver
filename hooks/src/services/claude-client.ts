/**
 * Claude CLI client for executing prompts via fork-session
 * Handles model selection, timeouts, and error handling
 */
import { tmpdir } from 'node:os';
import type { ClaudeModel } from '../core/types.ts';

/**
 * Options for building and executing Claude commands
 */
export interface ClaudeClientOptions {
  readonly prompt: string;
  readonly model: ClaudeModel;
  readonly sessionId: string;
  readonly timeoutMs?: number;
  /** Project directory - required for fork-session to find the session file */
  readonly cwd?: string;
  /** For testing - mock the actual execution */
  readonly _mockExecution?: () => Promise<{ output: string; exitCode: number }>;
}

/**
 * Result of executing a Claude command
 */
export interface ClaudeCommandResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
}

/**
 * Maps our model names to Claude CLI model identifiers
 */
function getModelIdentifier(model: ClaudeModel): string {
  switch (model) {
    case 'haiku':
      return 'claude-haiku-4-5-20251001';
    case 'sonnet':
      return 'claude-sonnet-4-5-20250929';
    case 'opus':
      return 'claude-opus-4-5-20251101';
  }
}

/**
 * Command arguments for array-based spawn (no shell interpretation)
 */
export interface ClaudeCommandArgs {
  readonly args: string[]; // readonly reference, but array contents are mutable for Bun.spawn
  readonly cwd: string;
}

/**
 * Builds the claude command arguments for array-based spawn
 * CRITICAL: Must run from project cwd for fork-session to find session files
 * Uses array-based approach to prevent shell injection
 */
export function buildClaudeCommand(options: ClaudeClientOptions): ClaudeCommandArgs {
  const { prompt, model, cwd } = options;
  const modelId = getModelIdentifier(model);

  // Array-based arguments prevent shell injection
  // Arguments are passed directly to process, not through shell
  // CRITICAL: --no-session-persistence required to avoid EROFS errors in Claude Code sandbox
  // CRITICAL: --debug required due to CLI bug where commands hang without it
  // NOTE: --output-format json causes hangs with fork-session, so we use plain text output
  const args = [
    'claude',
    '--debug',
    '--print',
    '--no-session-persistence',
    '--model',
    modelId,
  ];

  // DISABLED: fork-session is fundamentally broken in UserPromptSubmit hooks
  // See gotcha-userpromptsubmit-fork-session-confirmed-broken
  // See gotcha-retro-userpromptsubmit-hooks-should-not-use-fork-session
  //
  // The issue: UserPromptSubmit fires BEFORE prompt processing, so forking gives
  // context up to the PREVIOUS message. During session resume, the session isn't
  // fully loaded, causing "No conversation found" errors and 30-second timeouts.
  //
  // Future fix: Use PostToolUse hook instead, or implement conversation context
  // via transcript file parsing rather than fork-session.
  //
  // if (sessionId) {
  //   args.push('--resume', sessionId, '--fork-session');
  //   args.push('--tools', '');
  // }

  // Prompt must be last argument
  args.push(prompt);

  return {
    args,
    // CRITICAL: Must run from project dir for fork-session to find session files
    // Falls back to /tmp only if cwd not provided (non-fork scenarios)
    cwd: cwd || tmpdir(),
  };
}

/**
 * Executes a Claude command with timeout enforcement
 * Uses try/finally to guarantee timeout cleanup and prevent race conditions
 */
export async function executeClaudeCommand(
  options: ClaudeClientOptions
): Promise<ClaudeCommandResult> {
  const { timeoutMs = 30_000, _mockExecution } = options;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Use mock execution for testing
  if (_mockExecution) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Command timeout')), timeoutMs);
      });

      const executionPromise = _mockExecution();
      const result = await Promise.race([executionPromise, timeoutPromise]);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: `Command failed with exit code ${result.exitCode}: ${result.output}`,
        };
      }

      return {
        success: true,
        output: result.output,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout')) {
        return {
          success: false,
          error: `Command timeout after ${timeoutMs}ms`,
        };
      }
      return {
        success: false,
        error: message,
      };
    } finally {
      // Guaranteed cleanup - no race condition possible
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Real execution using Bun.spawn with array-based args (no shell interpretation)
  const { args, cwd } = buildClaudeCommand(options);
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
  });

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error('Command timeout'));
      }, timeoutMs);
    });

    const exitCode = await Promise.race([proc.exited, timeoutPromise]);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Command failed with exit code ${exitCode}: ${stderr || stdout}`,
      };
    }

    // Plain text output (--output-format json causes hangs with fork-session)
    return {
      success: true,
      output: stdout.trim(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('timeout')) {
      return {
        success: false,
        error: `Command timeout after ${timeoutMs}ms`,
      };
    }
    return {
      success: false,
      error: message,
    };
  } finally {
    // Guaranteed cleanup - no race condition possible
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    // CRITICAL: Kill the process and its children to prevent orphaned processes
    // Forked Claude sessions spawn child processes (LSP, git, chrome-devtools)
    // that don't exit when the parent completes. Explicit kill prevents leaks.
    // NOTE: In timeout scenarios, proc.kill() is called twice (once in timeout handler,
    // once here). The try-catch ensures the second call fails gracefully.
    try {
      proc.kill();
    } catch {
      // Process may have already exited naturally - ignore errors
    }
  }
}

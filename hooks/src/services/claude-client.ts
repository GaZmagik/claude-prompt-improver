/**
 * Claude CLI client for executing prompts via `claude --print`
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
  readonly timeoutMs?: number;
  /** Project directory the CLI runs from; falls back to the OS tmpdir */
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
 * Command arguments for array-based spawn (no shell interpretation)
 */
export interface ClaudeCommandArgs {
  readonly args: string[]; // readonly reference, but array contents are mutable for Bun.spawn
  readonly cwd: string;
}

/**
 * Builds the claude command arguments for array-based spawn
 * Uses array-based approach to prevent shell injection
 *
 * NOTE: fork-session (`--resume <id> --fork-session`) is deliberately not used.
 * UserPromptSubmit fires BEFORE prompt processing, so forking gives context up
 * to the PREVIOUS message, and during session resume the session isn't fully
 * loaded ("No conversation found" errors, 30-second timeouts).
 * See gotcha-userpromptsubmit-fork-session-confirmed-broken.
 */
export function buildClaudeCommand(options: ClaudeClientOptions): ClaudeCommandArgs {
  const { prompt, model, cwd } = options;

  // Array-based arguments prevent shell injection
  // Arguments are passed directly to process, not through shell
  // CRITICAL: --no-session-persistence required to avoid EROFS errors in Claude Code sandbox
  // CRITICAL: --debug required due to CLI bug where commands hang without it
  // NOTE: --output-format json causes hangs, so we use plain text output
  // ClaudeModel values are Claude CLI aliases; the CLI resolves each to the
  // latest model of that tier, so the plugin never pins a stale snapshot
  const args = ['claude', '--debug', '--print', '--no-session-persistence', '--model', model];

  // Prompt must be last argument
  args.push(prompt);

  return {
    args,
    cwd: cwd || tmpdir(),
  };
}

/**
 * Maps a thrown error to a command result, normalising timeouts
 */
function toErrorResult(err: unknown, timeoutMs: number): ClaudeCommandResult {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('timeout')) {
    return { success: false, error: `Command timeout after ${timeoutMs}ms` };
  }
  return { success: false, error: message };
}

/**
 * Executes the mock command path with timeout enforcement
 */
async function executeMockCommand(
  mockExecution: () => Promise<{ output: string; exitCode: number }>,
  timeoutMs: number
): Promise<ClaudeCommandResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Command timeout')), timeoutMs);
    });

    const result = await Promise.race([mockExecution(), timeoutPromise]);

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Command failed with exit code ${result.exitCode}: ${result.output}`,
      };
    }

    return { success: true, output: result.output };
  } catch (err) {
    return toErrorResult(err, timeoutMs);
  } finally {
    // Guaranteed cleanup - no race condition possible
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Executes a Claude command with timeout enforcement
 * Uses try/finally to guarantee timeout cleanup and prevent race conditions
 */
export async function executeClaudeCommand(
  options: ClaudeClientOptions
): Promise<ClaudeCommandResult> {
  const { timeoutMs = 30_000, _mockExecution } = options;

  // Use mock execution for testing
  if (_mockExecution) {
    return executeMockCommand(_mockExecution, timeoutMs);
  }

  // Real execution using Bun.spawn with array-based args (no shell interpretation)
  const { args, cwd } = buildClaudeCommand(options);
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error('Command timeout'));
      }, timeoutMs);
    });

    // Start draining stdout/stderr BEFORE awaiting exit: with --debug the child
    // can produce enough output to fill the OS pipe buffer, and an undrained
    // pipe would block it from ever exiting (classic pipe deadlock)
    const stdoutPromise = new Response(proc.stdout).text();
    const stderrPromise = new Response(proc.stderr).text();

    const exitCode = await Promise.race([proc.exited, timeoutPromise]);

    const stdout = await stdoutPromise;
    const stderr = await stderrPromise;

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Command failed with exit code ${exitCode}: ${stderr || stdout}`,
      };
    }

    // Plain text output (--output-format json causes hangs)
    return { success: true, output: stdout.trim() };
  } catch (err) {
    return toErrorResult(err, timeoutMs);
  } finally {
    // Guaranteed cleanup - no race condition possible
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    // CRITICAL: Kill the process and its children to prevent orphaned processes
    // Spawned Claude sessions can start child processes (LSP, git, chrome-devtools)
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

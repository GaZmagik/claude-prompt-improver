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
  readonly args: string[]; // Mutable for Bun.spawn compatibility
  readonly cwd: string;
}

/**
 * Builds the claude command arguments for array-based spawn
 * Per gotcha: Must run from /tmp to avoid project hook interference
 * Uses array-based approach to prevent shell injection
 */
export function buildClaudeCommand(options: ClaudeClientOptions): ClaudeCommandArgs {
  const { prompt, model, sessionId } = options;
  const modelId = getModelIdentifier(model);

  // Array-based arguments prevent shell injection
  // Arguments are passed directly to process, not through shell
  // CRITICAL: --no-session-persistence required to avoid EROFS errors in Claude Code sandbox
  const args = [
    'claude',
    '--print',
    '--no-session-persistence',
    '--model',
    modelId,
  ];

  // When sessionId is available, fork the session to access conversation context
  // This allows the improver to understand terms/acronyms defined earlier in the conversation
  if (sessionId) {
    args.push('--resume', sessionId, '--fork-session');
  }

  // Prompt must be last argument
  args.push(prompt);

  return {
    args,
    cwd: tmpdir(), // Run from temp dir to avoid project hooks
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
  }
}

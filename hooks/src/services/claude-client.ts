/**
 * Claude CLI client for executing prompts via fork-session
 * Handles model selection, timeouts, and error handling
 */
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
      return 'claude-3-5-haiku-latest';
    case 'sonnet':
      return 'claude-sonnet-4-5-20250514';
  }
}

/**
 * Escapes a string for safe use in shell commands
 */
function escapeForShell(str: string): string {
  // Use single quotes and escape any single quotes in the string
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Builds the claude command with fork-session for API isolation
 * Per gotcha: Must run from /tmp to avoid project hook interference
 */
export function buildClaudeCommand(options: ClaudeClientOptions): string {
  const { prompt, model, sessionId } = options;
  const modelId = getModelIdentifier(model);
  const escapedPrompt = escapeForShell(prompt);

  // Build command: cd /tmp to avoid project hooks, then execute claude
  // Using --fork-session to prevent recursion, --print for output only
  return `cd /tmp && claude --resume ${sessionId} --fork-session --print --model ${modelId} ${escapedPrompt}`;
}

/**
 * Executes a Claude command with timeout enforcement
 */
export async function executeClaudeCommand(
  options: ClaudeClientOptions
): Promise<ClaudeCommandResult> {
  const { timeoutMs = 30_000, _mockExecution } = options;

  try {
    // Use mock execution for testing
    if (_mockExecution) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Command timeout')), timeoutMs);
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
    }

    // Real execution using Bun.spawn
    const command = buildClaudeCommand(options);

    const proc = Bun.spawn(['bash', '-c', command], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error('Command timeout'));
      }, timeoutMs);
    });

    // Wait for process completion or timeout
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
  }
}

/**
 * Git context gatherer for enriching prompts with repository state
 * Gathers branch name, recent commits, and changed files
 */
import { GIT_COMMAND_TIMEOUT_MS } from '../core/constants.ts';

/**
 * Git context result
 */
export interface GitContext {
  readonly branch: string;
  readonly recentCommits: readonly GitCommit[];
  readonly changedFiles: readonly ChangedFile[];
  readonly diffStats: string;
}

/**
 * Git commit information
 */
export interface GitCommit {
  readonly hash: string;
  readonly message: string;
}

/**
 * Changed file information
 */
export interface ChangedFile {
  readonly path: string;
  readonly status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked';
}

/**
 * Options for gathering git context
 */
export interface GitContextOptions {
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly enabled?: boolean;
  /** For testing - mock command execution */
  readonly _mockCommandResults?: Record<string, string | null>;
}

/**
 * Result of gathering git context
 */
export interface GitContextResult {
  readonly success: boolean;
  readonly context?: GitContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'not_git_repo' | 'disabled' | 'timeout';
}

/**
 * Executes a git command with timeout
 */
export async function executeGitCommand(
  command: string,
  options: GitContextOptions
): Promise<{ success: boolean; output?: string; error?: string }> {
  const { _mockCommandResults, cwd, timeoutMs = GIT_COMMAND_TIMEOUT_MS } = options;

  // Handle mock responses for testing
  if (_mockCommandResults !== undefined) {
    const result = _mockCommandResults[command];
    if (result === null || result === undefined) {
      return { success: false, error: 'Command failed or timed out' };
    }
    return { success: true, output: result };
  }

  // Real command execution
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const proc = Bun.spawn(['git', ...command.split(' ')], {
      cwd: cwd || process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Race between completion and timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });

    const result = await Promise.race([proc.exited, timeoutPromise]);

    // Clean up timeout if process completed first
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (result === null) {
      // Timeout
      proc.kill();
      return { success: false, error: 'Command timed out' };
    }

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (result !== 0) {
      return { success: false, error: stderr || 'Command failed' };
    }

    return { success: true, output: stdout.trim() };
  } catch (err) {
    // Clean up timeout on error
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Parses git log output into commits
 */
export function parseGitLog(output: string): GitCommit[] {
  if (!output || output.trim().length === 0) {
    return [];
  }

  const lines = output.trim().split('\n');
  const commits: GitCommit[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Format: "hash message"
    const spaceIndex = line.indexOf(' ');
    if (spaceIndex === -1) continue;

    const hash = line.slice(0, spaceIndex);
    const message = line.slice(spaceIndex + 1);

    commits.push({ hash, message });
  }

  return commits;
}

/**
 * Parses git status output into changed files
 */
export function parseGitStatus(output: string): ChangedFile[] {
  if (!output || output.trim().length === 0) {
    return [];
  }

  const lines = output.trim().split('\n');
  const files: ChangedFile[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Git status --porcelain format: XY PATH or XY PATH -> NEWPATH
    // XY is 2 chars, followed by space(s), then path
    const statusCode = line.slice(0, 2);
    let path = line.slice(2).trim(); // Start at position 2, trim leading spaces

    // Handle renamed files (R  old -> new)
    if (path.includes(' -> ')) {
      const parts = path.split(' -> ');
      const newPath = parts[1];
      const oldPath = parts[0];
      path = newPath ?? oldPath ?? path;
    }

    let status: ChangedFile['status'];

    // Check both index and worktree status
    const indexStatus = statusCode[0];
    const worktreeStatus = statusCode[1];

    if (statusCode === '??') {
      status = 'untracked';
    } else if (indexStatus === 'R' || worktreeStatus === 'R') {
      status = 'renamed';
    } else if (indexStatus === 'C' || worktreeStatus === 'C') {
      status = 'copied';
    } else if (indexStatus === 'A' || worktreeStatus === 'A') {
      status = 'added';
    } else if (indexStatus === 'D' || worktreeStatus === 'D') {
      status = 'deleted';
    } else if (indexStatus === 'M' || worktreeStatus === 'M') {
      status = 'modified';
    } else {
      status = 'modified'; // Default fallback
    }

    files.push({ path, status });
  }

  return files;
}

/**
 * Parses branch name from git output
 */
export function parseBranchName(output: string): string {
  if (!output || output.trim().length === 0) {
    return '';
  }

  const lines = output.trim().split('\n');

  for (const line of lines) {
    // Find the line starting with * (current branch)
    if (line.startsWith('*')) {
      const branchPart = line.slice(1).trim();

      // Handle detached HEAD state
      if (branchPart.startsWith('(HEAD detached')) {
        return branchPart;
      }

      return branchPart;
    }
  }

  return '';
}

/**
 * Gathers git context from the repository
 */
export async function gatherGitContext(options: GitContextOptions): Promise<GitContextResult> {
  const { enabled = true } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  // Check if this is a git repository
  const gitDirResult = await executeGitCommand('rev-parse --git-dir', options);
  if (!gitDirResult.success) {
    return {
      success: false,
      skipped: true,
      skipReason: 'not_git_repo',
    };
  }

  // Check for timeout simulation in mocks
  if (options._mockCommandResults) {
    const branchResult = options._mockCommandResults['branch --show-current'];
    if (branchResult === null) {
      return {
        success: false,
        skipped: true,
        skipReason: 'timeout',
      };
    }
  }

  // Gather git information
  const [branchResult, logResult, statusResult, diffResult] = await Promise.all([
    executeGitCommand('branch --show-current', options),
    executeGitCommand('log --oneline -5', options),
    executeGitCommand('status --porcelain', options),
    executeGitCommand('diff --stat', options),
  ]);

  // Parse results
  const branch = branchResult.success ? branchResult.output || '' : '';
  const recentCommits = logResult.success ? parseGitLog(logResult.output || '') : [];
  const changedFiles = statusResult.success ? parseGitStatus(statusResult.output || '') : [];
  const diffStats = diffResult.success ? diffResult.output || '' : '';

  const context: GitContext = {
    branch,
    recentCommits,
    changedFiles,
    diffStats,
  };

  return {
    success: true,
    context,
  };
}

/**
 * Formats git context for injection into improvement prompt
 */
export function formatGitContext(context: GitContext): string {
  const parts: string[] = [];

  if (context.branch) {
    parts.push(`Branch: ${context.branch}`);
  }

  if (context.recentCommits.length > 0) {
    const commitsStr = context.recentCommits.map((c) => `  ${c.hash} ${c.message}`).join('\n');
    parts.push(`Recent commits:\n${commitsStr}`);
  }

  if (context.changedFiles.length > 0) {
    const filesStr = context.changedFiles.map((f) => `  [${f.status}] ${f.path}`).join('\n');
    parts.push(`Changed files:\n${filesStr}`);
  }

  if (context.diffStats) {
    parts.push(`Diff stats: ${context.diffStats}`);
  }

  return parts.join('\n\n');
}

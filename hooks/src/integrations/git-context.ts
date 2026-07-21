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
  /** Include recent commits (default: false) - opt-in for performance */
  readonly includeCommits?: boolean;
  /** Include diff stats (default: false) - opt-in for performance */
  readonly includeDiff?: boolean;
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
  args: string[],
  options: GitContextOptions
): Promise<{ success: boolean; output?: string; error?: string }> {
  const { _mockCommandResults, cwd, timeoutMs = GIT_COMMAND_TIMEOUT_MS } = options;

  // Handle mock responses for testing
  if (_mockCommandResults !== undefined) {
    const commandKey = args.join(' ');
    const result = _mockCommandResults[commandKey];
    if (result === null || result === undefined) {
      return { success: false, error: 'Command failed or timed out' };
    }
    return { success: true, output: result };
  }

  // Real command execution
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const proc = Bun.spawn(['git', ...args], {
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
 * Extracts the file path from a porcelain status line body (after the XY code)
 * Handles renamed files (R  old -> new) by taking the new path
 */
function parseStatusPath(pathPart: string): string {
  const path = pathPart.trim(); // Trim leading spaces after the XY code

  // Handle renamed files (R  old -> new)
  if (path.includes(' -> ')) {
    const parts = path.split(' -> ');
    const newPath = parts[1];
    const oldPath = parts[0];
    return newPath ?? oldPath ?? path;
  }

  return path;
}

/**
 * Maps a porcelain XY status code to a ChangedFile status
 * Checks both index and worktree status
 */
function parseStatusCode(statusCode: string): ChangedFile['status'] {
  if (statusCode === '??') {
    return 'untracked';
  }

  const indexStatus = statusCode[0];
  const worktreeStatus = statusCode[1];

  const statusMap: ReadonlyArray<[string, ChangedFile['status']]> = [
    ['R', 'renamed'],
    ['C', 'copied'],
    ['A', 'added'],
    ['D', 'deleted'],
    ['M', 'modified'],
  ];

  for (const [code, status] of statusMap) {
    if (indexStatus === code || worktreeStatus === code) {
      return status;
    }
  }

  return 'modified'; // Default fallback
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
    const path = parseStatusPath(line.slice(2));
    const status = parseStatusCode(statusCode);

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
 * Runs the pre-gathering skip checks (disabled, not a repo, mock timeout)
 * @returns a skip result if gathering should not proceed, undefined otherwise
 */
async function checkGatherPreconditions(
  options: GitContextOptions
): Promise<GitContextResult | undefined> {
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
  const gitDirResult = await executeGitCommand(['rev-parse', '--git-dir'], options);
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

  return undefined;
}

/**
 * Assembles a GitContext from the raw command results
 * (accounting for optional commands)
 */
function buildContextFromResults(
  results: Array<{ success: boolean; output?: string; error?: string }>,
  includeCommits: boolean,
  includeDiff: boolean
): GitContext {
  const branchResult = results[0];
  const statusResult = results[1];
  const logResult = includeCommits ? results[2] : undefined;
  const diffResult = includeDiff ? results[includeCommits ? 3 : 2] : undefined;

  const branch = branchResult?.success ? branchResult.output || '' : '';
  const changedFiles = statusResult?.success ? parseGitStatus(statusResult.output || '') : [];
  const recentCommits = logResult?.success ? parseGitLog(logResult.output || '') : [];
  const diffStats = diffResult?.success ? diffResult.output || '' : '';

  return {
    branch,
    recentCommits,
    changedFiles,
    diffStats,
  };
}

/**
 * Gathers git context from the repository
 */
export async function gatherGitContext(options: GitContextOptions): Promise<GitContextResult> {
  const skipResult = await checkGatherPreconditions(options);
  if (skipResult) {
    return skipResult;
  }

  // Gather git information - only fetch what's needed
  const { includeCommits = false, includeDiff = false } = options;

  // Always fetch branch and status (core context)
  const commands = [
    executeGitCommand(['branch', '--show-current'], options),
    executeGitCommand(['status', '--porcelain'], options),
  ];

  // Optionally fetch commits and diff (performance optimization)
  if (includeCommits) {
    commands.push(executeGitCommand(['log', '--oneline', '-5'], options));
  }
  if (includeDiff) {
    commands.push(executeGitCommand(['diff', '--stat'], options));
  }

  const results = await Promise.all(commands);
  const context = buildContextFromResults(results, includeCommits, includeDiff);

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

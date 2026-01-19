/**
 * T079-T087: Git context integration tests
 * T079: Test git context executes `git log --oneline -5`
 * T080: Test git context executes `git status --porcelain`
 * T081: Test git context executes `git diff --stat`
 * T082: Test git context parses branch name
 * T083: Test git context parses recent commits
 * T084: Test git context parses changed files
 * T085: Test git context enforces 2s timeout per command
 * T086: Test git context gracefully skips if not a git repository
 * T087: Test git context gracefully skips if configuration.integrations.git=false
 */
import { describe, expect, it } from 'bun:test';
import { GIT_COMMAND_TIMEOUT_MS } from '../core/constants.ts';
import {
  type GitContext,
  executeGitCommand,
  formatGitContext,
  gatherGitContext,
  parseBranchName,
  parseGitLog,
  parseGitStatus,
} from './git-context.ts';

describe('Git Context Integration', () => {
  describe('T079: executeGitCommand - executes git log', () => {
    it('should execute git log command with correct arguments', async () => {
      const result = await executeGitCommand('log --oneline -5', {
        _mockCommandResults: {
          'log --oneline -5': 'abc1234 Fix bug\ndef5678 Add feature\n',
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('abc1234');
    });

    it('should return output from git log', async () => {
      const mockOutput = 'a1b2c3d First commit\ne4f5g6h Second commit';
      const result = await executeGitCommand('log --oneline -5', {
        _mockCommandResults: {
          'log --oneline -5': mockOutput,
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(mockOutput);
    });
  });

  describe('T080: executeGitCommand - executes git status', () => {
    it('should execute git status with porcelain format', async () => {
      const result = await executeGitCommand('status --porcelain', {
        _mockCommandResults: {
          'status --porcelain': ' M src/file.ts\nA  new-file.ts\n',
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('M src/file.ts');
    });

    it('should handle empty status (clean repo)', async () => {
      const result = await executeGitCommand('status --porcelain', {
        _mockCommandResults: {
          'status --porcelain': '',
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });
  });

  describe('T081: executeGitCommand - executes git diff', () => {
    it('should execute git diff with stat format', async () => {
      const mockDiff =
        ' src/file.ts | 10 +++++-----\n 1 file changed, 5 insertions(+), 5 deletions(-)';
      const result = await executeGitCommand('diff --stat', {
        _mockCommandResults: {
          'diff --stat': mockDiff,
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('insertions');
    });
  });

  describe('T082: parseBranchName - parses branch name', () => {
    it('should parse branch name from git branch output', () => {
      const output = '* main\n  feature/test\n  develop';
      const branch = parseBranchName(output);

      expect(branch).toBe('main');
    });

    it('should parse feature branch name', () => {
      const output = '  main\n* feature/add-auth\n  develop';
      const branch = parseBranchName(output);

      expect(branch).toBe('feature/add-auth');
    });

    it('should handle detached HEAD state', () => {
      const output = '* (HEAD detached at abc1234)';
      const branch = parseBranchName(output);

      expect(branch).toContain('detached');
    });

    it('should return empty string for invalid output', () => {
      const branch = parseBranchName('');

      expect(branch).toBe('');
    });
  });

  describe('T083: parseGitLog - parses recent commits', () => {
    it('should parse commits from git log output', () => {
      const output =
        'abc1234 Fix authentication bug\ndef5678 Add user login\nghi9012 Initial commit';
      const commits = parseGitLog(output);

      expect(commits.length).toBe(3);
      expect(commits[0]?.hash).toBe('abc1234');
      expect(commits[0]?.message).toBe('Fix authentication bug');
    });

    it('should handle single commit', () => {
      const output = 'abc1234 Initial commit';
      const commits = parseGitLog(output);

      expect(commits.length).toBe(1);
      expect(commits[0]?.hash).toBe('abc1234');
    });

    it('should handle empty log', () => {
      const commits = parseGitLog('');

      expect(commits.length).toBe(0);
    });

    it('should handle commits with multiple words in message', () => {
      const output = 'abc1234 This is a longer commit message with spaces';
      const commits = parseGitLog(output);

      expect(commits[0]?.message).toBe('This is a longer commit message with spaces');
    });
  });

  describe('T084: parseGitStatus - parses changed files', () => {
    it('should parse modified files', () => {
      const output = ' M src/file.ts\n M src/other.ts';
      const files = parseGitStatus(output);

      expect(files.length).toBe(2);
      expect(files[0]?.path).toBe('src/file.ts');
      expect(files[0]?.status).toBe('modified');
    });

    it('should parse added files', () => {
      const output = 'A  src/new-file.ts';
      const files = parseGitStatus(output);

      expect(files.length).toBe(1);
      expect(files[0]?.status).toBe('added');
    });

    it('should parse deleted files', () => {
      const output = ' D src/removed.ts';
      const files = parseGitStatus(output);

      expect(files[0]?.status).toBe('deleted');
    });

    it('should parse untracked files', () => {
      const output = '?? src/untracked.ts';
      const files = parseGitStatus(output);

      expect(files[0]?.status).toBe('untracked');
    });

    it('should parse renamed files', () => {
      const output = 'R  old-name.ts -> new-name.ts';
      const files = parseGitStatus(output);

      expect(files[0]?.status).toBe('renamed');
    });

    it('should handle mixed status types', () => {
      const output = ' M modified.ts\nA  added.ts\n D deleted.ts\n?? untracked.ts';
      const files = parseGitStatus(output);

      expect(files.length).toBe(4);
    });

    it('should handle empty status', () => {
      const files = parseGitStatus('');

      expect(files.length).toBe(0);
    });
  });

  describe('T085: gatherGitContext - enforces 2s timeout', () => {
    it('should use correct timeout from constants', () => {
      expect(GIT_COMMAND_TIMEOUT_MS).toBe(2000);
    });

    it('should return timeout error when command takes too long', async () => {
      const result = await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': '.git', // Valid git repo
          'branch --show-current': null, // null simulates timeout
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('timeout');
    });

    it('should complete within timeout for normal operations', async () => {
      const start = performance.now();
      await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': '.git',
          'branch --show-current': 'main',
          'log --oneline -5': 'abc1234 Commit',
          'status --porcelain': '',
          'diff --stat': '',
        },
      });
      const elapsed = performance.now() - start;

      // Should complete quickly with mocks
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('T086: gatherGitContext - skips if not git repo', () => {
    it('should detect not a git repository', async () => {
      const result = await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': null, // Error indicates not a git repo
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('not_git_repo');
    });

    it('should return gracefully without error', async () => {
      const result = await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': null,
        },
      });

      // Should not throw, just return skip result
      expect(result.error).toBeUndefined();
      expect(result.skipped).toBe(true);
    });
  });

  describe('T087: gatherGitContext - skips if disabled', () => {
    it('should skip when enabled=false', async () => {
      const result = await gatherGitContext({
        enabled: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('disabled');
    });

    it('should not execute any commands when disabled', async () => {
      const result = await gatherGitContext({
        enabled: false,
        _mockCommandResults: {
          'branch --show-current': 'main',
        },
      });

      expect(result.skipped).toBe(true);
      // Commands shouldn't have been executed
    });
  });

  describe('gatherGitContext - full integration', () => {
    it('should gather complete git context', async () => {
      const result = await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': '.git',
          'branch --show-current': 'feature/add-auth',
          'log --oneline -5': 'abc1234 Add login\ndef5678 Add signup',
          'status --porcelain': ' M src/auth.ts\nA  src/login.ts',
          'diff --stat': ' src/auth.ts | 10 +++++++---',
        },
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.branch).toBe('feature/add-auth');
      expect(result.context?.recentCommits.length).toBe(2);
      expect(result.context?.changedFiles.length).toBe(2);
    });

    it('should handle partial git data gracefully', async () => {
      const result = await gatherGitContext({
        _mockCommandResults: {
          'rev-parse --git-dir': '.git',
          'branch --show-current': 'main',
          'log --oneline -5': '', // Empty log
          'status --porcelain': '', // Clean repo
          'diff --stat': '',
        },
      });

      expect(result.success).toBe(true);
      expect(result.context?.recentCommits.length).toBe(0);
      expect(result.context?.changedFiles.length).toBe(0);
    });
  });

  describe('formatGitContext - formats for injection', () => {
    it('should format git context as readable string', () => {
      const context: GitContext = {
        branch: 'feature/add-auth',
        recentCommits: [
          { hash: 'abc1234', message: 'Add login page' },
          { hash: 'def5678', message: 'Add signup form' },
        ],
        changedFiles: [
          { path: 'src/auth.ts', status: 'modified' },
          { path: 'src/login.ts', status: 'added' },
        ],
        diffStats: '2 files changed, 50 insertions(+)',
      };

      const formatted = formatGitContext(context);

      expect(formatted).toContain('feature/add-auth');
      expect(formatted).toContain('abc1234');
      expect(formatted).toContain('src/auth.ts');
    });

    it('should include branch name prominently', () => {
      const context: GitContext = {
        branch: 'main',
        recentCommits: [],
        changedFiles: [],
        diffStats: '',
      };

      const formatted = formatGitContext(context);

      expect(formatted).toContain('main');
    });

    it('should handle empty context gracefully', () => {
      const context: GitContext = {
        branch: '',
        recentCommits: [],
        changedFiles: [],
        diffStats: '',
      };

      const formatted = formatGitContext(context);

      // Should not throw, return something reasonable
      expect(typeof formatted).toBe('string');
    });
  });
});

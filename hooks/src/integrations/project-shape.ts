/**
 * Project-shape context integration
 * Gathers top-level directory layout, package.json scripts, the test
 * framework, and recently modified files (git) so the improver can name
 * real files and commands instead of speaking in generalities
 * Guarded: any failure returns partial or no context, never throws
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Directories that add noise rather than shape */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.claude',
  'dist',
  'build',
  'coverage',
  '.next',
  '.venv',
  '__pycache__',
]);

/** Known test frameworks, checked against package.json dependencies */
const TEST_FRAMEWORKS = ['vitest', 'jest', 'mocha', 'ava', 'playwright', 'cypress'] as const;

/** Timeout for the git subprocess (matches other integrations' 2s budget) */
const GIT_TIMEOUT_MS = 2_000;

/** Maximum recently-modified files to include */
const MAX_RECENT_FILES = 10;

/** Options for gathering project shape */
export interface ProjectShapeOptions {
  readonly enabled?: boolean;
  readonly cwd?: string;
}

/** Gathered project shape */
export interface ProjectShapeContext {
  readonly directories: readonly string[];
  readonly scripts?: Readonly<Record<string, string>>;
  readonly testFramework?: string;
  readonly recentFiles?: readonly string[];
}

/** Result of gathering project shape */
export interface ProjectShapeResult {
  readonly success: boolean;
  readonly context?: ProjectShapeContext;
}

/**
 * Reads package.json scripts and detects the test framework
 * Returns undefined fields when package.json is absent or unparseable
 */
async function readPackageInfo(cwd: string): Promise<{
  scripts?: Record<string, string>;
  testFramework?: string;
}> {
  try {
    const raw = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const framework = TEST_FRAMEWORKS.find((f) => f in allDeps);
    // Bun projects often have no framework dependency; infer from the test script
    const testScript = pkg.scripts?.test ?? '';
    const inferred = framework ?? (testScript.includes('bun test') ? 'bun' : undefined);

    return {
      ...(pkg.scripts && { scripts: pkg.scripts }),
      ...(inferred && { testFramework: inferred }),
    };
  } catch {
    return {};
  }
}

/**
 * Lists recently modified files via git, deduplicated across recent commits
 * Returns undefined outside a git repository or on timeout
 */
async function readRecentFiles(cwd: string): Promise<string[] | undefined> {
  try {
    const proc = Bun.spawn(['git', 'log', '--name-only', '--pretty=format:', '-5'], {
      cwd,
      stdout: 'pipe',
      stderr: 'ignore',
    });

    const timeout = setTimeout(() => proc.kill(), GIT_TIMEOUT_MS);
    try {
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        return undefined;
      }
      const output = await new Response(proc.stdout).text();
      const files = [...new Set(output.split('\n').filter((line) => line.trim().length > 0))];
      return files.length > 0 ? files.slice(0, MAX_RECENT_FILES) : undefined;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return undefined;
  }
}

/**
 * Gathers project shape from the working directory
 * Never throws; a missing directory yields { success: false }
 */
export async function gatherProjectShape(
  options: ProjectShapeOptions
): Promise<ProjectShapeResult> {
  if (options.enabled === false) {
    return { success: false };
  }
  const cwd = options.cwd ?? process.cwd();

  try {
    const dirStat = await stat(cwd);
    if (!dirStat.isDirectory()) {
      return { success: false };
    }
  } catch {
    return { success: false };
  }

  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    const directories = entries
      .filter((e) => e.isDirectory() && !IGNORED_DIRECTORIES.has(e.name) && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();

    const [pkgInfo, recentFiles] = await Promise.all([readPackageInfo(cwd), readRecentFiles(cwd)]);

    return {
      success: true,
      context: {
        directories,
        ...(pkgInfo.scripts && { scripts: pkgInfo.scripts }),
        ...(pkgInfo.testFramework && { testFramework: pkgInfo.testFramework }),
        ...(recentFiles && { recentFiles }),
      },
    };
  } catch {
    return { success: false };
  }
}

/**
 * Formats project shape into a compact block for prompt injection
 */
export function formatProjectShape(context: ProjectShapeContext): string {
  const parts: string[] = [];

  if (context.directories.length > 0) {
    parts.push(`Top-level directories: ${context.directories.join(', ')}`);
  }
  if (context.scripts && Object.keys(context.scripts).length > 0) {
    const scripts = Object.entries(context.scripts)
      .map(([name, cmd]) => `${name}: ${cmd}`)
      .join('; ');
    parts.push(`Scripts: ${scripts}`);
  }
  if (context.testFramework) {
    parts.push(`Test framework: ${context.testFramework}`);
  }
  if (context.recentFiles && context.recentFiles.length > 0) {
    parts.push(`Recently modified: ${context.recentFiles.join(', ')}`);
  }

  return parts.join('\n');
}

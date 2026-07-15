/**
 * Tests for project-shape context integration
 * Gathers top-level directory layout, package scripts, test framework,
 * and recently modified files so improved prompts can cite real targets
 */
import { describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatProjectShape, gatherProjectShape } from './project-shape.ts';

function makeTempProject(): string {
  const dir = join(tmpdir(), `project-shape-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'tests'), { recursive: true });
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'temp-project',
      scripts: { test: 'vitest run', build: 'tsc -p .' },
      devDependencies: { vitest: '^1.0.0' },
    })
  );
  return dir;
}

describe('gatherProjectShape', () => {
  it('gathers top-level directories excluding noise', async () => {
    const dir = makeTempProject();
    try {
      const result = await gatherProjectShape({ enabled: true, cwd: dir });

      expect(result.success).toBe(true);
      expect(result.context?.directories).toContain('src');
      expect(result.context?.directories).toContain('tests');
      expect(result.context?.directories).not.toContain('node_modules');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gathers package scripts and detects the test framework', async () => {
    const dir = makeTempProject();
    try {
      const result = await gatherProjectShape({ enabled: true, cwd: dir });

      expect(result.context?.scripts).toEqual({ test: 'vitest run', build: 'tsc -p .' });
      expect(result.context?.testFramework).toBe('vitest');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('succeeds without package.json or git (partial context)', async () => {
    const dir = join(tmpdir(), `project-shape-bare-${Date.now()}`);
    mkdirSync(join(dir, 'docs'), { recursive: true });
    try {
      const result = await gatherProjectShape({ enabled: true, cwd: dir });

      expect(result.success).toBe(true);
      expect(result.context?.directories).toContain('docs');
      expect(result.context?.scripts).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns failure for a nonexistent directory instead of throwing', async () => {
    const result = await gatherProjectShape({
      enabled: true,
      cwd: '/nonexistent/path/that/does/not/exist',
    });

    expect(result.success).toBe(false);
  });

  it('gathers recently modified files when run inside a git repository', async () => {
    // This repo itself is a git worktree with commits
    const result = await gatherProjectShape({ enabled: true, cwd: process.cwd() });

    expect(result.success).toBe(true);
    expect(result.context?.recentFiles?.length).toBeGreaterThan(0);
  });
});

describe('formatProjectShape', () => {
  it('formats gathered context into a compact readable block', () => {
    const formatted = formatProjectShape({
      directories: ['src', 'tests'],
      scripts: { test: 'bun test' },
      testFramework: 'bun',
      recentFiles: ['src/index.ts', 'README.md'],
    });

    expect(formatted).toContain('src');
    expect(formatted).toContain('bun test');
    expect(formatted).toContain('src/index.ts');
  });

  it('omits absent sections', () => {
    const formatted = formatProjectShape({ directories: ['docs'] });

    expect(formatted).toContain('docs');
    expect(formatted).not.toContain('Scripts');
    expect(formatted).not.toContain('Recently modified');
  });
});

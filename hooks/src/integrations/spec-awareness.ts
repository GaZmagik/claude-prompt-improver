/**
 * Specification awareness integration for enriching prompts with spec context
 * Parses .specify/ directory for spec.md, plan.md, and tasks.md
 */
import { existsSync, readFileSync, statSync } from 'node:fs';

/**
 * Cache entry for spec file content with mtime validation
 */
interface SpecFileCacheEntry {
  readonly content: string;
  readonly mtimeMs: number;
}

/** Cache for spec file contents keyed by path */
const specFileCache = new Map<string, SpecFileCacheEntry>();

/**
 * Gets file modification time, returns -1 if file doesn't exist
 */
function getFileMtime(filePath: string): number {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return -1;
  }
}

/**
 * Clears the spec file cache (useful for testing)
 */
export function clearSpecFileCache(): void {
  specFileCache.clear();
}

/** Spec file types */
export type SpecFileType = 'spec' | 'plan' | 'tasks';

/**
 * User story from spec.md
 */
export interface UserStory {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * Phase from plan.md
 */
export interface PlanPhase {
  readonly id: string;
  readonly name: string;
  readonly status?: 'pending' | 'in_progress' | 'completed';
}

/**
 * Task from tasks.md
 */
export interface SpecTask {
  readonly id: string;
  readonly title: string;
  readonly status: 'pending' | 'completed';
  readonly userStory?: string;
}

/**
 * Parsed specification context
 */
export interface SpecContext {
  readonly featureName: string;
  readonly userStories: readonly UserStory[];
  readonly phases: readonly PlanPhase[];
  readonly tasks: readonly SpecTask[];
  readonly currentPhase?: string;
}

/**
 * Options for gathering spec context
 */
export interface SpecAwarenessOptions {
  readonly enabled?: boolean;
  readonly specifyPath?: string;
  readonly featurePath?: string;
  /** For testing - mock file system reads */
  readonly _mockFileSystem?: Record<string, string | null>;
}

/**
 * Result of gathering spec context
 */
export interface SpecAwarenessResult {
  readonly success: boolean;
  readonly context?: SpecContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'disabled' | 'no_specify_dir' | 'no_spec_file';
}

/**
 * Checks if .specify/ directory exists
 */
export function checkSpecifyDirectory(options: SpecAwarenessOptions): boolean {
  const { specifyPath = '.specify', _mockFileSystem } = options;

  if (_mockFileSystem) {
    // Check for directory key (with trailing slash)
    const dirKey = specifyPath.endsWith('/') ? specifyPath : `${specifyPath}/`;
    return dirKey in _mockFileSystem;
  }

  // Real implementation - check filesystem
  return existsSync(specifyPath);
}

/**
 * Parses YAML frontmatter from markdown file
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return {};
  }

  const yamlContent = frontmatterMatch[1];
  const result: Record<string, unknown> = {};

  // Simple YAML parser for common cases
  const lines = yamlContent.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Check for array item
    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch?.[1] && currentKey && currentArray) {
      currentArray.push(arrayMatch[1].trim());
      continue;
    }

    // Check for key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch?.[1]) {
      // Save previous array if exists
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }

      currentKey = kvMatch[1];
      const value = (kvMatch[2] ?? '').trim();

      if (value === '') {
        // Could be array or nested object starting
        currentArray = [];
      } else {
        result[currentKey] = value;
        currentArray = null;
      }
    }
  }

  // Save final array if exists
  if (currentKey && currentArray && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Extracts user stories from spec.md content
 */
export function extractUserStories(content: string): UserStory[] {
  const stories: UserStory[] = [];

  // Match ### US{id}: {title} pattern
  const storyRegex = /###\s+(US\d+):\s+(.+?)(?=\n###|\n##|$)/gs;
  let match;

  while ((match = storyRegex.exec(content)) !== null) {
    const id = match[1];
    const titleAndContent = match[2];
    if (!id || !titleAndContent) continue;

    const lines = titleAndContent.trim().split('\n');
    const title = (lines[0] ?? '').trim();
    if (!title) continue;

    // Everything after the first line and "As a user..." line is description
    const descriptionLines = lines.slice(1).filter((l) => l.trim() && !l.trim().startsWith('As a'));
    const description =
      descriptionLines.length > 0 ? descriptionLines.join('\n').trim() : undefined;

    if (description) {
      stories.push({ id, title, description });
    } else {
      stories.push({ id, title });
    }
  }

  return stories;
}

/**
 * Parses phases from plan.md content
 */
export function parsePlanPhases(content: string): PlanPhase[] {
  const phases: PlanPhase[] = [];

  // Match ## Phase {id}: {name} or ### Phase {id}: {name} pattern
  const phaseRegex = /##[#]?\s*Phase\s+(\d+):\s+(.+?)(?=\n##|$)/gs;
  let match;

  while ((match = phaseRegex.exec(content)) !== null) {
    const id = match[1];
    const nameAndContent = match[2];
    if (!id || !nameAndContent) continue;

    const lines = nameAndContent.trim().split('\n');
    const name = (lines[0] ?? '').trim();
    if (!name) continue;

    // Look for Status: line
    let status: 'pending' | 'in_progress' | 'completed' | undefined;
    for (const line of lines) {
      const statusMatch = line.match(/Status:\s*(\w+)/i);
      if (statusMatch?.[1]) {
        const rawStatus = statusMatch[1].toLowerCase();
        if (rawStatus === 'completed') status = 'completed';
        else if (rawStatus === 'in_progress') status = 'in_progress';
        else if (rawStatus === 'pending') status = 'pending';
      }
    }

    if (status) {
      phases.push({ id, name, status });
    } else {
      phases.push({ id, name });
    }
  }

  return phases;
}

/**
 * Parses tasks from tasks.md content
 */
export function parseTasks(content: string): SpecTask[] {
  const tasks: SpecTask[] = [];

  // Match - [X] or - [ ] followed by task info
  const taskRegex = /^-\s+\[([ Xx])\]\s+(T\d+)(.+)$/gm;
  let match;

  while ((match = taskRegex.exec(content)) !== null) {
    const checkMark = match[1];
    const id = match[2];
    const rest = match[3];
    if (!checkMark || !id || !rest) continue;

    const completed = checkMark.toLowerCase() === 'x';

    // Extract user story reference [US{n}]
    const usMatch = rest.match(/\[US(\d+)\]/);
    const userStory = usMatch?.[1] ? `US${usMatch[1]}` : undefined;

    // Extract title - remove [P], [US{n}], and path references
    const title = rest
      .replace(/\[P\]/g, '')
      .replace(/\[US\d+\]/g, '')
      .replace(/in\s+\/[\w/./-]+/g, '')
      .trim();

    if (userStory) {
      tasks.push({ id, title, status: completed ? 'completed' : 'pending', userStory });
    } else {
      tasks.push({ id, title, status: completed ? 'completed' : 'pending' });
    }
  }

  return tasks;
}

/**
 * Matches user stories to prompt keywords
 */
export function matchUserStoriesToPrompt(stories: UserStory[], prompt: string): UserStory[] {
  const promptLower = prompt.toLowerCase();
  const words = promptLower.split(/\s+/).filter((w) => w.length > 2);

  return stories.filter((story) => {
    const titleLower = story.title.toLowerCase();
    const descLower = (story.description || '').toLowerCase();

    // Check if any prompt word matches title or description
    for (const word of words) {
      if (titleLower.includes(word) || descLower.includes(word)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Helper to read file from mock or real filesystem with mtime-based caching
 */
function readFile(path: string, mockFs?: Record<string, string | null>): string | null {
  if (mockFs) {
    return mockFs[path] ?? null;
  }

  // Check cache with mtime validation
  const currentMtime = getFileMtime(path);
  if (currentMtime === -1) {
    // File doesn't exist
    specFileCache.delete(path);
    return null;
  }

  const cached = specFileCache.get(path);
  if (cached && cached.mtimeMs === currentMtime) {
    return cached.content;
  }

  // Read fresh content and update cache
  try {
    const content = readFileSync(path, 'utf-8');
    specFileCache.set(path, { content, mtimeMs: currentMtime });
    return content;
  } catch {
    return null;
  }
}

/**
 * Gathers specification context from .specify/ directory
 */
export async function gatherSpecContext(
  options: SpecAwarenessOptions
): Promise<SpecAwarenessResult> {
  const { enabled = true, featurePath, _mockFileSystem } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  // Check if .specify/ directory exists
  if (!checkSpecifyDirectory(options)) {
    return {
      success: false,
      skipped: true,
      skipReason: 'no_specify_dir',
    };
  }

  // Determine spec file path
  const specPath = featurePath ? `${featurePath}/spec.md` : '.specify/spec.md';
  const specContent = readFile(specPath, _mockFileSystem);

  if (!specContent) {
    return {
      success: false,
      skipped: true,
      skipReason: 'no_spec_file',
    };
  }

  // Parse spec.md
  const frontmatter = parseFrontmatter(specContent);
  const featureName = (frontmatter.feature as string) || '';
  const userStories = extractUserStories(specContent);

  // Parse plan.md if available
  const planPath = featurePath ? `${featurePath}/plan.md` : '.specify/plan.md';
  const planContent = readFile(planPath, _mockFileSystem);
  const phases = planContent ? parsePlanPhases(planContent) : [];

  // Determine current phase
  let currentPhase: string | undefined;
  const inProgressPhase = phases.find((p) => p.status === 'in_progress');
  if (inProgressPhase) {
    currentPhase = inProgressPhase.name;
  }

  // Parse tasks.md if available
  const tasksPath = featurePath ? `${featurePath}/tasks.md` : '.specify/tasks.md';
  const tasksContent = readFile(tasksPath, _mockFileSystem);
  const tasks = tasksContent ? parseTasks(tasksContent) : [];

  const context: SpecContext = currentPhase
    ? { featureName, userStories, phases, tasks, currentPhase }
    : { featureName, userStories, phases, tasks };

  return {
    success: true,
    context,
  };
}

/**
 * Formats spec context for injection into improvement prompt
 */
export function formatSpecContext(context: SpecContext): string {
  if (!context.featureName && context.userStories.length === 0 && context.tasks.length === 0) {
    return '';
  }

  const lines: string[] = [];

  if (context.featureName) {
    lines.push(`Feature: ${context.featureName}`);
  }

  if (context.currentPhase) {
    lines.push(`Current Phase: ${context.currentPhase}`);
  }

  if (context.userStories.length > 0) {
    lines.push('');
    lines.push('User Stories:');
    for (const story of context.userStories) {
      lines.push(`- ${story.id}: ${story.title}`);
    }
  }

  if (context.phases.length > 0) {
    lines.push('');
    lines.push('Phases:');
    for (const phase of context.phases) {
      const status = phase.status ? ` (${phase.status})` : '';
      lines.push(`- Phase ${phase.id}: ${phase.name}${status}`);
    }
  }

  if (context.tasks.length > 0) {
    const completed = context.tasks.filter((t) => t.status === 'completed').length;
    const total = context.tasks.length;
    lines.push('');
    lines.push(`Tasks: ${completed}/${total} complete`);
  }

  return lines.join('\n');
}

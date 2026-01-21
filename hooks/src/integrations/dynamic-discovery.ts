/**
 * Dynamic discovery integration for agents, commands, skills, and output styles
 * Scans filesystem at runtime to discover available resources and match to prompts
 */
import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { parseFrontmatter } from './spec-awareness.ts';
import { matchItemsByKeywords, type ItemMatchResult } from '../utils/keyword-matcher.ts';
import { scanDirectory, type DirectoryScannerOptions } from '../utils/directory-scanner.ts';
import { readFileSyncSafe } from '../utils/file-reader.ts';

/** Maximum number of suggestions to show */
export const MAX_SUGGESTIONS = 5;

/** Resource types that can be discovered */
export type ResourceType = 'agent' | 'command' | 'skill' | 'outputStyle';

/** Source of discovered resource */
export type ResourceSource = 'global' | 'local';

/**
 * A discovered resource (agent, command, skill, or output style)
 */
export interface DiscoveredItem {
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly filePath: string;
  readonly resourceType: ResourceType;
  readonly source: ResourceSource;
}

/**
 * Matched item with relevance score
 */
export interface MatchedItem {
  readonly item: DiscoveredItem;
  readonly matchedKeywords: readonly string[];
  readonly score: number;
}

/**
 * Aggregated discovery results
 */
export interface DynamicContext {
  readonly matchedAgents: readonly MatchedItem[];
  readonly matchedCommands: readonly MatchedItem[];
  readonly matchedSkills: readonly MatchedItem[];
  readonly matchedOutputStyles: readonly MatchedItem[];
  readonly isMemoryThinkContext: boolean;
  readonly totalAgents: number;
  readonly totalCommands: number;
  readonly totalSkills: number;
  readonly totalOutputStyles: number;
}

/**
 * Mock file content for testing
 */
export interface MockFileSystem {
  [path: string]:
    | string
    | {
        type: 'directory';
        entries: Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
      };
}

/**
 * Options for dynamic discovery
 */
export interface DynamicDiscoveryOptions {
  readonly prompt?: string;
  readonly enabled?: boolean;
  readonly _mockFileSystem?: MockFileSystem;
}

/**
 * Result of dynamic discovery
 */
export interface DynamicDiscoveryResult {
  readonly success: boolean;
  readonly context?: DynamicContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'disabled' | 'no_resources';
}

/**
 * Extracts keywords from description text
 */
function extractKeywordsFromDescription(description: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'and',
    'but',
    'or',
    'nor',
    'so',
    'yet',
    'both',
    'either',
    'neither',
    'not',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'just',
    'use',
    'this',
    'that',
    'these',
    'those',
    'when',
    'where',
    'which',
    'while',
    'who',
    'whom',
    'whose',
    'why',
    'how',
    'all',
    'each',
    'every',
    'any',
    'some',
    'no',
    'such',
  ]);

  // Split on non-alphanumeric, filter short words and stop words
  return description
    .toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Parses resource metadata from file content
 */
export function parseResourceMetadata(
  content: string,
  filePath: string,
  resourceType: ResourceType,
  source: ResourceSource
): DiscoveredItem {
  const filename = basename(filePath, '.md');

  // Try to parse frontmatter
  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = parseFrontmatter(content);
  } catch {
    // Malformed YAML - use filename fallback
  }

  // Extract name (frontmatter > filename)
  // Validate that name looks reasonable (not malformed YAML artifact)
  const rawName = frontmatter.name;
  const isValidName =
    typeof rawName === 'string' && rawName.length > 0 && !rawName.includes('[') && !rawName.includes('{');
  const name = isValidName ? rawName : filename;

  // Extract description
  const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';

  // Extract keywords (explicit > from description > empty)
  let keywords: string[] = [];
  if (Array.isArray(frontmatter.keywords)) {
    keywords = frontmatter.keywords.filter((k): k is string => typeof k === 'string');
  } else if (description) {
    keywords = extractKeywordsFromDescription(description);
  }

  return {
    name,
    description,
    keywords,
    filePath,
    resourceType,
    source,
  };
}

/**
 * Converts mock filesystem to directory scanner format
 */
function convertMockFs(
  mockFs: MockFileSystem
): DirectoryScannerOptions['_mockFileSystem'] | undefined {
  if (!mockFs) return undefined;

  const result: Record<
    string,
    {
      type: 'directory' | 'file';
      entries?: Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
      _error?: 'ENOENT' | 'EACCES' | 'ENOTDIR';
    }
  > = {};

  for (const [path, value] of Object.entries(mockFs)) {
    if (typeof value === 'object' && 'type' in value && value.type === 'directory') {
      result[path] = value;
    }
  }

  return result;
}

/**
 * Reads file content from mock or real filesystem
 */
function readFileContent(filePath: string, mockFs?: MockFileSystem): string | null {
  if (mockFs) {
    const content = mockFs[filePath];
    return typeof content === 'string' ? content : null;
  }
  return readFileSyncSafe(filePath);
}

/**
 * Expands ~ to home directory
 */
function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}

/**
 * Discovers agents from global and local directories
 */
export async function discoverAgents(
  options: DynamicDiscoveryOptions = {}
): Promise<DiscoveredItem[]> {
  const { _mockFileSystem } = options;
  const agents: DiscoveredItem[] = [];
  const seenNames = new Map<string, DiscoveredItem>();

  // Define directories to scan (local first for precedence)
  const directories: Array<{ path: string; source: ResourceSource }> = [
    { path: '.claude/agents/', source: 'local' },
    { path: '~/.claude/agents/', source: 'global' },
  ];

  for (const { path, source } of directories) {
    const expandedPath = _mockFileSystem ? path : expandPath(path);
    const scannerMockFs = convertMockFs(_mockFileSystem ?? {});

    const scanResult = await scanDirectory(
      expandedPath,
      scannerMockFs
        ? { extensions: ['.md'], _mockFileSystem: scannerMockFs }
        : { extensions: ['.md'] }
    );

    if (!scanResult.success) {
      continue; // Directory doesn't exist or error - skip gracefully
    }

    for (const filePath of scanResult.files) {
      const content = readFileContent(filePath, _mockFileSystem);
      if (!content) continue;

      const item = parseResourceMetadata(content, filePath, 'agent', source);

      // Deduplicate by normalised name (case-insensitive)
      const normalisedName = item.name.toLowerCase();
      if (!seenNames.has(normalisedName)) {
        seenNames.set(normalisedName, item);
        agents.push(item);
      }
      // If already seen, local takes precedence (already added first)
    }
  }

  return agents;
}

/**
 * Discovers commands from global and local directories
 */
export async function discoverCommands(
  options: DynamicDiscoveryOptions = {}
): Promise<DiscoveredItem[]> {
  const { _mockFileSystem } = options;
  const commands: DiscoveredItem[] = [];
  const seenNames = new Map<string, DiscoveredItem>();

  const directories: Array<{ path: string; source: ResourceSource }> = [
    { path: '.claude/commands/', source: 'local' },
    { path: '~/.claude/commands/', source: 'global' },
  ];

  for (const { path, source } of directories) {
    const expandedPath = _mockFileSystem ? path : expandPath(path);
    const scannerMockFs = convertMockFs(_mockFileSystem ?? {});

    const scanResult = await scanDirectory(
      expandedPath,
      scannerMockFs
        ? { extensions: ['.md'], _mockFileSystem: scannerMockFs }
        : { extensions: ['.md'] }
    );

    if (!scanResult.success) continue;

    for (const filePath of scanResult.files) {
      const content = readFileContent(filePath, _mockFileSystem);
      if (!content) continue;

      const item = parseResourceMetadata(content, filePath, 'command', source);
      const normalisedName = item.name.toLowerCase();
      if (!seenNames.has(normalisedName)) {
        seenNames.set(normalisedName, item);
        commands.push(item);
      }
    }
  }

  return commands;
}

/**
 * Discovers output styles from global and local directories
 */
export async function discoverOutputStyles(
  options: DynamicDiscoveryOptions = {}
): Promise<DiscoveredItem[]> {
  const { _mockFileSystem } = options;
  const styles: DiscoveredItem[] = [];
  const seenNames = new Map<string, DiscoveredItem>();

  const directories: Array<{ path: string; source: ResourceSource }> = [
    { path: '.claude/output-styles/', source: 'local' },
    { path: '~/.claude/output-styles/', source: 'global' },
  ];

  for (const { path, source } of directories) {
    const expandedPath = _mockFileSystem ? path : expandPath(path);
    const scannerMockFs = convertMockFs(_mockFileSystem ?? {});

    const scanResult = await scanDirectory(
      expandedPath,
      scannerMockFs
        ? { extensions: ['.md'], _mockFileSystem: scannerMockFs }
        : { extensions: ['.md'] }
    );

    if (!scanResult.success) continue;

    for (const filePath of scanResult.files) {
      const content = readFileContent(filePath, _mockFileSystem);
      if (!content) continue;

      const item = parseResourceMetadata(content, filePath, 'outputStyle', source);
      const normalisedName = item.name.toLowerCase();
      if (!seenNames.has(normalisedName)) {
        seenNames.set(normalisedName, item);
        styles.push(item);
      }
    }
  }

  return styles;
}

/**
 * Discovers skills from global and local directories
 * Skills are directories containing a SKILL.md file
 */
export async function discoverSkills(
  options: DynamicDiscoveryOptions = {}
): Promise<DiscoveredItem[]> {
  const { _mockFileSystem } = options;
  const skills: DiscoveredItem[] = [];
  const seenNames = new Map<string, DiscoveredItem>();

  const directories: Array<{ path: string; source: ResourceSource }> = [
    { path: '.claude/skills/', source: 'local' },
    { path: '~/.claude/skills/', source: 'global' },
  ];

  for (const { path, source } of directories) {
    const expandedPath = _mockFileSystem ? path : expandPath(path);
    const scannerMockFs = convertMockFs(_mockFileSystem ?? {});

    // Scan for subdirectories (each skill is a directory)
    const scanResult = await scanDirectory(
      expandedPath,
      scannerMockFs ? { _mockFileSystem: scannerMockFs } : {}
    );

    if (!scanResult.success) continue;

    // For each directory entry, look for SKILL.md
    const mockDirData = _mockFileSystem?.[expandedPath];
    if (_mockFileSystem && mockDirData && typeof mockDirData === 'object' && 'entries' in mockDirData) {
      // Mock filesystem: iterate directory entries
      for (const entry of mockDirData.entries) {
        if (!entry.isDirectory) continue;
        // Skip .disabled directories
        if (entry.name.endsWith('.disabled')) continue;

        const skillDir = `${expandedPath}${entry.name}/`;
        const skillFilePath = `${skillDir}SKILL.md`;
        const content = readFileContent(skillFilePath, _mockFileSystem);
        if (!content) continue;

        const item = parseResourceMetadata(content, skillFilePath, 'skill', source);
        // Use directory name as fallback if no name in frontmatter
        const name = item.name === 'SKILL' ? entry.name : item.name;
        const normalisedName = name.toLowerCase();

        if (!seenNames.has(normalisedName)) {
          seenNames.set(normalisedName, { ...item, name });
          skills.push({ ...item, name });
        }
      }
    } else if (!_mockFileSystem) {
      // Real filesystem: use fs to read directory
      const { readdirSync } = await import('node:fs');
      try {
        const entries = readdirSync(expandedPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          // Skip .disabled directories
          if (entry.name.endsWith('.disabled')) continue;

          const skillDir = `${expandedPath}${entry.name}/`;
          const skillFilePath = `${skillDir}SKILL.md`;
          const content = readFileContent(skillFilePath, _mockFileSystem);
          if (!content) continue;

          const item = parseResourceMetadata(content, skillFilePath, 'skill', source);
          // Use directory name as fallback if no name in frontmatter
          const name = item.name === 'SKILL' ? entry.name : item.name;
          const normalisedName = name.toLowerCase();

          if (!seenNames.has(normalisedName)) {
            seenNames.set(normalisedName, { ...item, name });
            skills.push({ ...item, name });
          }
        }
      } catch {
        // Directory doesn't exist or can't be read - skip gracefully
      }
    }
  }

  return skills;
}

/**
 * Matches agents to prompt using keyword matching
 */
export function matchAgentsToPrompt(
  agents: readonly DiscoveredItem[],
  prompt: string
): ItemMatchResult<DiscoveredItem>[] {
  const results = matchItemsByKeywords(prompt, agents, (agent) => agent.keywords);

  // Limit to MAX_SUGGESTIONS
  return results.slice(0, MAX_SUGGESTIONS);
}

/**
 * Formats agent suggestions for injection
 */
export function formatAgentSuggestions(agents: readonly DiscoveredItem[], total: number): string {
  if (agents.length === 0) {
    return '';
  }

  const lines: string[] = ['Available agents:'];

  for (const agent of agents) {
    lines.push(`- ${agent.name}: ${agent.description}`);
  }

  const remaining = total - agents.length;
  if (remaining > 0) {
    lines.push(`(and ${remaining} more available)`);
  }

  return lines.join('\n');
}

/**
 * Memory think command pattern regex
 * Matches: memory think create/add/counter/branch/conclude
 */
const MEMORY_THINK_PATTERN = /memory\s+think\s+(create|add|counter|branch|conclude)/i;

/**
 * Detects if a prompt contains memory think command pattern
 */
export function isMemoryThinkPrompt(prompt: string): boolean {
  return MEMORY_THINK_PATTERN.test(prompt);
}

/**
 * Gathers dynamic context from all sources
 */
export async function gatherDynamicContext(
  options: DynamicDiscoveryOptions
): Promise<DynamicDiscoveryResult> {
  const { prompt = '', enabled = true, _mockFileSystem } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  try {
    const opts = _mockFileSystem ? { _mockFileSystem } : {};

    // Discover all sources in parallel
    const [allAgents, allCommands, allSkills, allOutputStyles] = await Promise.all([
      discoverAgents(opts),
      discoverCommands(opts),
      discoverSkills(opts),
      discoverOutputStyles(opts),
    ]);

    // Match to prompt
    const matchedAgents = prompt ? matchAgentsToPrompt(allAgents, prompt) : [];
    const matchedCommands = prompt
      ? matchItemsByKeywords(prompt, allCommands, (c) => c.keywords).slice(0, MAX_SUGGESTIONS)
      : [];
    const matchedSkills = prompt
      ? matchItemsByKeywords(prompt, allSkills, (s) => s.keywords).slice(0, MAX_SUGGESTIONS)
      : [];
    const matchedOutputStyles = prompt
      ? matchItemsByKeywords(prompt, allOutputStyles, (s) => s.keywords).slice(0, MAX_SUGGESTIONS)
      : [];

    const context: DynamicContext = {
      matchedAgents,
      matchedCommands,
      matchedSkills,
      matchedOutputStyles,
      isMemoryThinkContext: isMemoryThinkPrompt(prompt),
      totalAgents: allAgents.length,
      totalCommands: allCommands.length,
      totalSkills: allSkills.length,
      totalOutputStyles: allOutputStyles.length,
    };

    return {
      success: true,
      context,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Formats dynamic context for injection into improvement prompt
 */
export function formatDynamicContext(context: DynamicContext): string {
  const sections: string[] = [];

  // Special formatting for memory think context
  if (context.isMemoryThinkContext) {
    sections.push('Consider using --agent <name> for domain expertise or --style <name> for perspective.');

    if (context.matchedAgents.length > 0) {
      const agentNames = context.matchedAgents.slice(0, 5).map((m) => m.item.name);
      sections.push(`Suggested agents: ${agentNames.join(', ')}`);
    }

    if (context.matchedOutputStyles.length > 0) {
      const styleNames = context.matchedOutputStyles.slice(0, 5).map((m) => m.item.name);
      sections.push(`Suggested styles: ${styleNames.join(', ')}`);
    }

    return sections.join('\n');
  }

  // Regular formatting for non-memory-think context
  if (context.matchedAgents.length > 0) {
    const agentItems = context.matchedAgents.map((m) => m.item);
    sections.push(formatAgentSuggestions(agentItems, context.totalAgents));
  }

  return sections.join('\n\n');
}

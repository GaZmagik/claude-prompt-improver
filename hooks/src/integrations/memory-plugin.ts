/**
 * Memory plugin integration for enriching prompts with relevant memories
 * Detects claude-memory-plugin and retrieves matching memories from index.json
 */
import { existsSync } from 'node:fs';
import { readFileSyncSafe } from '../utils/file-reader.ts';

/** Maximum number of memories to include */
const MAX_MEMORIES = 5;

/** Memory types */
export type MemoryType = 'decision' | 'learning' | 'artifact' | 'gotcha' | 'other';

/**
 * Single memory entry from index.json
 */
export interface Memory {
  readonly id: string;
  readonly title: string;
  readonly type: MemoryType;
  readonly tags: readonly string[];
  readonly description?: string;
}

/**
 * Memory index structure
 */
export interface MemoryIndex {
  readonly memories: readonly Memory[];
}

/**
 * Memory context containing matched memories
 */
export interface MemoryContext {
  readonly memories: readonly Memory[];
}

/**
 * Options for gathering memory context
 */
export interface MemoryPluginOptions {
  readonly enabled?: boolean;
  readonly prompt?: string;
  /** For testing - mock file system reads */
  readonly _mockFileSystem?: Record<string, string | null>;
}

/**
 * Result of checking plugin installation
 */
export interface PluginCheckResult {
  readonly found: boolean;
  readonly path?: string;
}

/**
 * Result of gathering memory context
 */
export interface MemoryPluginResult {
  readonly success: boolean;
  readonly context?: MemoryContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'disabled' | 'plugin_not_installed' | 'no_index_file' | 'index_parse_error';
}

/** Known plugin installation paths */
const PLUGIN_PATHS = [
  '.claude/memory/',
  '.claude/plugins/claude-memory-plugin/',
  '~/.claude/plugins/cache/enhance/claude-memory-plugin/',
];

/**
 * Checks if memory plugin is installed at known paths
 */
export function checkMemoryPluginInstalled(options: MemoryPluginOptions): PluginCheckResult {
  const { _mockFileSystem } = options;

  if (_mockFileSystem) {
    for (const path of PLUGIN_PATHS) {
      const dirKey = path.endsWith('/') ? path : `${path}/`;
      if (dirKey in _mockFileSystem) {
        return { found: true, path };
      }
    }
    return { found: false };
  }

  // Real implementation - check filesystem for known paths
  for (const path of PLUGIN_PATHS) {
    // Expand ~ to home directory
    const expandedPath = path.startsWith('~/') ? path.replace('~', process.env.HOME ?? '') : path;
    if (existsSync(expandedPath)) {
      return { found: true, path: expandedPath };
    }
  }
  return { found: false };
}

/**
 * Parses memory index.json content
 */
export function parseMemoryIndex(content: string): MemoryIndex {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.memories)) {
      return { memories: parsed.memories };
    }
    return { memories: [] };
  } catch {
    return { memories: [] };
  }
}

/**
 * Matches memories by title keywords
 */
export function matchMemoriesByTitle(memories: Memory[], prompt: string): Memory[] {
  const promptLower = prompt.toLowerCase();
  // Filter words with >2 characters (min 3 chars) to exclude articles/prepositions like "a", "in", "of"
  const words = promptLower.split(/\s+/).filter((w) => w.length > 2);

  return memories.filter((memory) => {
    const titleLower = memory.title.toLowerCase();
    for (const word of words) {
      if (titleLower.includes(word)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Matches memories by tag keywords
 */
export function matchMemoriesByTags(memories: Memory[], prompt: string): Memory[] {
  const promptLower = prompt.toLowerCase();
  // Filter words with >2 characters (min 3 chars) to exclude articles/prepositions
  const words = promptLower.split(/\s+/).filter((w) => w.length > 2);

  return memories.filter((memory) => {
    if (!memory.tags || memory.tags.length === 0) {
      return false;
    }
    const tagsLower = memory.tags.map((t) => t.toLowerCase());
    for (const word of words) {
      if (tagsLower.some((tag) => tag.includes(word) || word.includes(tag))) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Scores and ranks memories by relevance to prompt
 *
 * Note: Uses custom scoring logic rather than shared keyword-matcher utility because:
 * - Bidirectional matching for tags (tag.includes(word) || word.includes(tag))
 * - Weighted scoring (title matches: 3pts, tag matches: 2pts, type boost: 1pt)
 * - Splits prompt into words rather than matching keywords against prompt
 *
 * @param memories - Memories to score
 * @param prompt - User prompt to match against
 * @returns Scored memories with relevance scores
 */
function scoreMemories(
  memories: Memory[],
  prompt: string
): Array<{ memory: Memory; score: number }> {
  const promptLower = prompt.toLowerCase();
  // Filter words with >2 characters (min 3 chars) to exclude articles/prepositions
  const words = promptLower.split(/\s+/).filter((w) => w.length > 2);

  return memories.map((memory) => {
    let score = 0;
    const titleLower = memory.title.toLowerCase();
    const tagsLower = memory.tags.map((t) => t.toLowerCase());

    for (const word of words) {
      // Title matches are worth more (3 points per word)
      if (titleLower.includes(word)) score += 3;
      // Tag matches (2 points per word, bidirectional)
      if (tagsLower.some((tag) => tag.includes(word) || word.includes(tag))) score += 2;
    }

    // Boost certain memory types
    if (memory.type === 'decision') score += 1;
    if (memory.type === 'gotcha') score += 1;

    return { memory, score };
  });
}


/**
 * Gathers memory context from the memory plugin
 */
export async function gatherMemoryContext(
  options: MemoryPluginOptions
): Promise<MemoryPluginResult> {
  const { enabled = true, prompt = '', _mockFileSystem } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  // Check if plugin is installed
  const pluginCheck = checkMemoryPluginInstalled(options);
  if (!pluginCheck.found) {
    return {
      success: false,
      skipped: true,
      skipReason: 'plugin_not_installed',
    };
  }

  // Read index.json
  const indexPath = `${pluginCheck.path}index.json`;
  const indexContent = readFileSyncSafe(indexPath, _mockFileSystem);

  if (!indexContent) {
    return {
      success: false,
      skipped: true,
      skipReason: 'no_index_file',
    };
  }

  // Parse index
  const index = parseMemoryIndex(indexContent);

  // Check for parse error (empty memories from invalid JSON)
  if (
    index.memories.length === 0 &&
    indexContent.trim() !== '{"memories":[]}' &&
    indexContent.trim() !== '{ "memories": [] }'
  ) {
    // Could be invalid JSON or truly empty - try to detect
    try {
      const parsed = JSON.parse(indexContent);
      if (!Array.isArray(parsed.memories)) {
        return {
          success: false,
          skipped: true,
          skipReason: 'index_parse_error',
        };
      }
    } catch {
      return {
        success: false,
        skipped: true,
        skipReason: 'index_parse_error',
      };
    }
  }

  // Score and filter memories
  const scored = scoreMemories([...index.memories], prompt);
  const filtered = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MEMORIES)
    .map((s) => s.memory);

  return {
    success: true,
    context: {
      memories: filtered,
    },
  };
}

/**
 * Formats memory context for injection into improvement prompt
 */
export function formatMemoryContext(context: MemoryContext): string {
  if (context.memories.length === 0) {
    return '';
  }

  const lines: string[] = ['Relevant Memories:'];

  for (const memory of context.memories) {
    lines.push(`- [${memory.type}] ${memory.title}`);
    if (memory.tags.length > 0) {
      lines.push(`  Tags: ${memory.tags.join(', ')}`);
    }
  }

  return lines.join('\n');
}

# Data Model: Dynamic Context Injection v1.3.0

**Purpose**: Define TypeScript interfaces and data structures for dynamic discovery system

**Date**: 2026-01-21

---

## Entity: DiscoveredItem

**Description**: A resource (agent, command, skill, or output style) discovered during filesystem scanning

**TypeScript Definition**:
```typescript
export interface DiscoveredItem {
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly filePath: string;
  readonly resourceType: ResourceType;
  readonly source: ResourceSource;
}

export type ResourceType = 'agent' | 'command' | 'skill' | 'outputStyle';
export type ResourceSource = 'global' | 'local';
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | 1-200 chars | Display name extracted from frontmatter or filename |
| description | string | Yes | 0-1000 chars | Description from frontmatter, empty if missing |
| keywords | string[] | Yes | 0-100 items | Extracted keywords for matching |
| filePath | string | Yes | Valid absolute path | Absolute path to source file |
| resourceType | ResourceType | Yes | Enum value | Type of resource discovered |
| source | ResourceSource | Yes | Enum value | Global (~/.claude/) or local (.claude/) |

**Relationships**:
- Multiple DiscoveredItems are matched to a Prompt via keyword matching
- DiscoveredItems are cached in DiscoveryCache by filePath
- DiscoveredItems are aggregated into DynamicContext

**State Transitions**: Immutable (readonly fields)

**Validation Rules**:
- name must not be empty after trimming
- filePath must be absolute path
- keywords array may be empty (fallback to filename)
- description may be empty string (missing frontmatter)

---

## Entity: CacheEntry

**Description**: LRU cache entry for parsed resource metadata with mtime-based invalidation

**TypeScript Definition**:
```typescript
export interface CacheEntry {
  readonly content: DiscoveredItem;
  readonly mtimeMs: number;
  readonly lastAccessed: number;
}
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| content | DiscoveredItem | Yes | Valid DiscoveredItem | Parsed resource metadata |
| mtimeMs | number | Yes | Positive integer | File modification time in milliseconds (from fs.statSync) |
| lastAccessed | number | Yes | Positive integer | Timestamp when entry last accessed (for LRU eviction) |

**Relationships**:
- CacheEntry is stored in DiscoveryCache Map with filePath as key
- CacheEntry.content is a DiscoveredItem
- Multiple CacheEntries form the DiscoveryCache collection

**State Transitions**:
```
Created → Accessed (lastAccessed updated) → Invalidated (mtime changed) → Evicted (LRU policy)
```

**Validation Rules**:
- mtimeMs must match current file mtime for cache hit
- lastAccessed updated on every cache access
- Evicted when cache size exceeds MAX_CACHE_SIZE and has oldest lastAccessed

---

## Entity: DiscoveryCache

**Description**: LRU cache for parsed resource definitions to avoid redundant filesystem operations

**TypeScript Definition**:
```typescript
export class DiscoveryCache {
  private readonly cache: Map<string, CacheEntry>;
  private readonly maxSize: number;

  constructor(maxSize: number = MAX_CACHE_SIZE);

  get(filePath: string): DiscoveredItem | null;
  set(filePath: string, item: DiscoveredItem, mtimeMs: number): void;
  invalidate(filePath: string): void;
  clear(): void;
  private evictLRU(): void;
}

const MAX_CACHE_SIZE = 50;
```

**Attributes**:
- cache: Map<string, CacheEntry> - Internal storage, key = absolute file path
- maxSize: number - Maximum cache entries (default 50)

**Methods**:
| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| get | filePath: string | DiscoveredItem \| null | Retrieve cached item if valid, check mtime, update lastAccessed |
| set | filePath, item, mtimeMs | void | Store item in cache, evict LRU if needed |
| invalidate | filePath: string | void | Remove specific entry from cache |
| clear | - | void | Remove all entries (for testing) |
| evictLRU | - | void | Private method to remove oldest accessed entry |

**Relationships**:
- DiscoveryCache contains multiple CacheEntry objects
- DiscoveryCache is used by all discovery functions (agents, commands, skills, styles)

**Validation Rules**:
- When cache.size > maxSize, evictLRU() is called
- get() checks current file mtime against cached mtimeMs
- If mtime differs, cache miss (return null, invalidate entry)

---

## Entity: DynamicContext

**Description**: Aggregated discovery results for all resource types matched to user prompt

**TypeScript Definition**:
```typescript
export interface DynamicContext {
  readonly matchedAgents: readonly MatchedItem[];
  readonly matchedCommands: readonly MatchedItem[];
  readonly matchedSkills: readonly MatchedItem[];
  readonly matchedOutputStyles: readonly MatchedItem[];
  readonly isMemoryThinkContext: boolean;
}

export interface MatchedItem {
  readonly item: DiscoveredItem;
  readonly matchedKeywords: readonly string[];
  readonly score: number;
}
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| matchedAgents | MatchedItem[] | Yes | 0-5 items | Top 5 agents matched to prompt |
| matchedCommands | MatchedItem[] | Yes | 0-5 items | Top 5 commands matched to prompt |
| matchedSkills | MatchedItem[] | Yes | 0-5 items | Top 5 skills matched to prompt |
| matchedOutputStyles | MatchedItem[] | Yes | 0-5 items | Top 5 output styles matched to prompt |
| isMemoryThinkContext | boolean | Yes | - | True if memory think pattern detected in prompt |

**MatchedItem Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| item | DiscoveredItem | Yes | Valid DiscoveredItem | The matched resource |
| matchedKeywords | string[] | Yes | 1+ items | Keywords that matched the prompt |
| score | number | Yes | Positive integer | Relevance score (number of matched keywords) |

**Relationships**:
- DynamicContext is derived from DiscoveredItems matched to Prompt
- DynamicContext is injected into ImprovedPrompt via formatDynamicContext()
- DynamicContext contains MatchedItems which wrap DiscoveredItems

**Validation Rules**:
- Each matched resource array limited to 5 items maximum
- MatchedItems sorted by score descending (highest relevance first)
- isMemoryThinkContext determined by regex pattern matching on prompt

---

## Entity: ResourceDirectory

**Description**: A filesystem location scanned for resources during discovery

**TypeScript Definition**:
```typescript
export interface ResourceDirectory {
  readonly path: string;
  readonly type: ResourceType;
  readonly scope: ResourceSource;
  readonly exists: boolean;
}
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| path | string | Yes | Valid absolute path | Absolute filesystem path |
| type | ResourceType | Yes | Enum value | Type of resources in this directory |
| scope | ResourceSource | Yes | Enum value | Global or local |
| exists | boolean | Yes | - | Whether directory exists on filesystem |

**Predefined Directories**:
```typescript
const RESOURCE_DIRECTORIES: ResourceDirectory[] = [
  // Agents
  { path: '~/.claude/agents/', type: 'agent', scope: 'global' },
  { path: '.claude/agents/', type: 'agent', scope: 'local' },

  // Commands
  { path: '~/.claude/commands/', type: 'command', scope: 'global' },
  { path: '.claude/commands/', type: 'command', scope: 'local' },

  // Skills
  { path: '~/.claude/skills/', type: 'skill', scope: 'global' },
  { path: '.claude/skills/', type: 'skill', scope: 'local' },

  // Output Styles
  { path: '~/.claude/output-styles/', type: 'outputStyle', scope: 'global' },
  { path: '.claude/output-styles/', type: 'outputStyle', scope: 'local' },
];
```

**Relationships**:
- ResourceDirectory contains multiple DiscoveredItems
- Multiple ResourceDirectories scanned in parallel during discovery

**Validation Rules**:
- Path must exist for directory to be scanned
- Missing directories gracefully skipped (not an error)
- Local directories take precedence over global for same-named resources

---

## Entity: MemoryThinkContext

**Description**: Specialised formatting context for memory think prompts

**TypeScript Definition**:
```typescript
export interface MemoryThinkContext {
  readonly pattern: MemoryThinkPattern;
  readonly suggestedAgents: readonly MatchedItem[];
  readonly suggestedStyles: readonly MatchedItem[];
  readonly usageGuidance: string;
}

export type MemoryThinkPattern =
  | 'create'
  | 'add'
  | 'counter'
  | 'branch'
  | 'conclude';
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| pattern | MemoryThinkPattern | Yes | Enum value | Which memory think command detected |
| suggestedAgents | MatchedItem[] | Yes | 0-5 items | Top agents for memory think context |
| suggestedStyles | MatchedItem[] | Yes | 0-5 items | Top styles for memory think context |
| usageGuidance | string | Yes | Non-empty | Formatted text explaining --agent and --style flags |

**Relationships**:
- MemoryThinkContext is a specialised view of DynamicContext
- Created when isMemoryThinkContext === true
- Used by formatMemoryThinkSuggestions() instead of formatDynamicContext()

**Validation Rules**:
- pattern extracted from regex match on prompt
- suggestedAgents/suggestedStyles limited to 3-5 most relevant
- usageGuidance includes concrete examples with detected pattern

**Example Usage Guidance**:
```
💡 Memory Think Suggestions:

Consider using --agent <name> for domain expertise or --style <name> for perspective.

Suggested Agents:
- memory think add 'security consideration' --agent security-expert
- memory think add 'architecture decision' --agent system-architect

Suggested Styles:
- memory think counter 'this approach' --style devil's-advocate
- memory think branch 'alternative view' --style socratic
```

---

## Entity: DynamicDiscoveryOptions

**Description**: Configuration options for gathering dynamic context

**TypeScript Definition**:
```typescript
export interface DynamicDiscoveryOptions {
  readonly enabled?: boolean;
  readonly _mockFileSystem?: Record<string, string | null>;
}
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| enabled | boolean | No | - | Whether discovery is enabled (default: true) |
| _mockFileSystem | Record<string, string \| null> | No | - | Mock filesystem for testing (not for production) |

**Relationships**:
- DynamicDiscoveryOptions passed to gatherDynamicContext()
- Follows pattern from SpecAwarenessOptions and MemoryPluginOptions

**Validation Rules**:
- enabled defaults to true if not specified
- _mockFileSystem only used in tests
- When enabled === false, returns { success: false, skipped: true, skipReason: 'disabled' }

---

## Entity: DynamicDiscoveryResult

**Description**: Result of gathering dynamic context, including success/error states

**TypeScript Definition**:
```typescript
export interface DynamicDiscoveryResult {
  readonly success: boolean;
  readonly context?: DynamicContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: SkipReason;
}

export type SkipReason =
  | 'disabled'
  | 'no_resources_found'
  | 'timeout'
  | 'filesystem_error';
```

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| success | boolean | Yes | - | Whether discovery succeeded |
| context | DynamicContext | No | Present if success=true | Discovered and matched resources |
| error | string | No | Present if success=false | Error message for debugging |
| skipped | boolean | No | - | Whether discovery was skipped (not an error) |
| skipReason | SkipReason | No | Present if skipped=true | Reason for skipping |

**Relationships**:
- DynamicDiscoveryResult returned by gatherDynamicContext()
- Follows pattern from SpecAwarenessResult and MemoryPluginResult
- Consumed by context-builder.ts via Promise.allSettled

**State Transitions**:
```
Requested → Success (context present) → Formatted → Injected
         → Skipped (no resources / disabled) → Ignored
         → Error (filesystem/timeout) → Logged, Partial Result
```

**Validation Rules**:
- success=true requires context to be present
- success=false may have error message
- skipped=true requires skipReason
- Graceful degradation: errors don't crash, return skipped result

---

## Auxiliary Types

### ScanResult
**Description**: Result of scanning a single directory

```typescript
export interface ScanResult {
  readonly directory: ResourceDirectory;
  readonly items: readonly DiscoveredItem[];
  readonly timedOut: boolean;
  readonly error?: string;
}
```

### ParseResult
**Description**: Result of parsing a single resource file

```typescript
export interface ParseResult {
  readonly success: boolean;
  readonly item?: DiscoveredItem;
  readonly error?: string;
}
```

### KeywordExtractionResult
**Description**: Result of extracting keywords from text

```typescript
export interface KeywordExtractionResult {
  readonly keywords: readonly string[];
  readonly source: 'explicit' | 'description' | 'filename';
}
```

---

## Data Flow Diagram

```
User Prompt
    ↓
gatherDynamicContext(options)
    ↓
Scan Directories (parallel)
    ↓
~/.claude/agents/  →  [DiscoveredItem, ...]
.claude/agents/    →  [DiscoveredItem, ...]
~/.claude/commands/→  [DiscoveredItem, ...]
... (8 directories total)
    ↓
Deduplicate (local > global)
    ↓
Cache Items (DiscoveryCache)
    ↓
Match to Prompt (matchItemsByKeywords)
    ↓
[MatchedItem, MatchedItem, ...]
    ↓
Aggregate into DynamicContext
    ↓
Detect Memory Think Pattern?
    ↓
Yes → MemoryThinkContext    No → DynamicContext
    ↓                           ↓
formatMemoryThinkSuggestions   formatDynamicContext
    ↓                           ↓
Formatted String (injected into ImprovedPrompt)
```

---

## Constants

```typescript
/** Maximum cache entries before LRU eviction */
export const MAX_CACHE_SIZE = 50;

/** Maximum suggestions per resource type */
export const MAX_SUGGESTIONS = 5;

/** Timeout for directory scanning (milliseconds) */
export const SCAN_TIMEOUT_MS = 2000;

/** Memory think command pattern regex */
export const MEMORY_THINK_PATTERN = /memory\s+think\s+(create|add|counter|branch|conclude)/i;

/** Resource directory paths */
export const GLOBAL_AGENTS_DIR = '~/.claude/agents/';
export const LOCAL_AGENTS_DIR = '.claude/agents/';
export const GLOBAL_COMMANDS_DIR = '~/.claude/commands/';
export const LOCAL_COMMANDS_DIR = '.claude/commands/';
export const GLOBAL_SKILLS_DIR = '~/.claude/skills/';
export const LOCAL_SKILLS_DIR = '.claude/skills/';
export const GLOBAL_STYLES_DIR = '~/.claude/output-styles/';
export const LOCAL_STYLES_DIR = '.claude/output-styles/';
```

---

## Database Schema (N/A)

This feature does not use a database. All data is:
- **Discovered**: Filesystem scanning at runtime
- **Cached**: In-memory LRU cache (Map<string, CacheEntry>)
- **Ephemeral**: Cache cleared on process restart

No persistent storage required beyond the markdown files themselves in `.claude/` directories.

---

**Status**: Data Model Complete | **All Interfaces Defined** | **Ready for Implementation**

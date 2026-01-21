# Exploration: Dynamic Context Injection v1.2.0

**Created**: 2026-01-21
**Explorer**: Claude Sonnet 4.5
**Status**: Ready for Specification

---

## Feature Intent

The Claude Prompt Improver plugin currently uses hardcoded skill rules and agent definitions for matching prompts to relevant context. This exploration addresses the need to dynamically discover available agents, skills, commands, and output styles from the filesystem at runtime, eliminating the need for configuration-based lists.

The feature will scan `~/.claude/` and `.claude/` directories to discover:
- Agent definitions (markdown files with frontmatter)
- Skill definitions
- Custom commands
- Output styles (for formatting)
- Plugin-provided skills from nested directories

When a user's prompt matches discovered items, the improved prompt will include suggestions for relevant agents, skills, or commands. Special handling is required for `memory think` prompts to suggest available agents and output styles for deliberation.

The implementation must follow existing integration patterns (git-context, spec-awareness, memory-plugin) and maintain the plugin's performance characteristics with appropriate caching.

---

## Suggested Specify Prompt

Use this as the argument for `/speckit:specify`:

```
Feature: Dynamic Context Injection v1.2.0

The Claude Prompt Improver plugin must dynamically discover and inject suggestions for available agents, skills, commands, and output styles by scanning the filesystem at runtime, replacing the current hardcoded approach.

## User Stories

**US1: As a plugin user, I want the prompt improver to automatically discover agents in ~/.claude/agents/ and .claude/agents/ so that relevant agent suggestions are injected without manual configuration.**

Success criteria:
- Plugin scans both global (~/.claude/agents/) and local (.claude/agents/) directories for .md files
- Parses markdown frontmatter to extract name, description, and keywords
- Matches prompt keywords against agent definitions using existing keyword-matcher utility
- Injects matched agents into improved prompts with format: "Available agents: - AgentName: Description"
- Caches discovered agents with mtime-based invalidation to avoid repeated filesystem reads
- Handles missing directories gracefully (no errors if directories don't exist)

**US2: As a plugin user, I want the prompt improver to discover skills from multiple sources so that skill suggestions adapt to my installed plugins.**

Success criteria:
- Scans ~/.claude/skills/, .claude/skills/, and plugin skill directories (e.g., ~/.claude/plugins/*/skills/)
- Supports skill definition format (determine during specification: JSON, markdown, or both)
- Matches prompt against skill keywords
- Injects matched skills into improved prompts
- Caches skills per directory with mtime validation
- Plugin skills merged with global/local skills without duplication

**US3: As a plugin user, when I use memory think commands, I want suggestions for available agents and output styles to enhance my deliberation.**

Success criteria:
- Detects "memory think" pattern in user prompt
- Scans ~/.claude/agents/ and .claude/output-styles/ for available options
- Injects suggestion text into improved prompt, e.g., "Consider using --agent <name> for domain expertise or --style <name> for perspective"
- Lists top 3-5 most relevant agents/styles based on prompt keywords
- Special formatting distinguishes this from regular context injection

**US4: As a developer, I want filesystem scanning to follow existing integration patterns so that the feature is consistent, testable, and maintainable.**

Success criteria:
- New integration file: hooks/src/integrations/dynamic-discovery.ts
- Follows pattern: gatherDynamicContext() async function, formatDynamicContext() formatter, DynamicDiscoveryOptions interface
- Includes _mockFileSystem option for testing (like other integrations)
- Integrated into context-builder.ts alongside git, lsp, spec, memory integrations
- Promise.allSettled pattern for async gathering with non-fatal failures
- Comprehensive test coverage following TDD (P2 from constitution)

**US5: As a plugin user, I want dynamic discovery to be performant so that prompt improvement doesn't introduce noticeable latency.**

Success criteria:
- LRU cache with mtime-based invalidation (pattern from spec-awareness.ts)
- Cache size limit: 50 entries (configurable constant MAX_CACHE_SIZE)
- Uses Node.js fs.readdir with { recursive: true, withFileTypes: true } for efficient scanning
- Dirent objects used to avoid extra stat() calls
- Cache key: directory path → { items: T[], mtimeMs: number }
- Cache cleared/invalidated when directory modification time changes
- Timeout handling (2s per directory scan, consistent with other integrations)

## Constraints

1. **No new dependencies**: Reuse existing parseFrontmatter() function for YAML parsing (follows P5 Simplicity from constitution)
2. **Backwards compatibility**: Feature must work when directories don't exist (graceful degradation)
3. **Configuration**: Must respect existing integration toggle pattern (e.g., integrations.dynamicDiscovery: true/false in config)
4. **File format assumptions**: Confirm during specification phase:
   - Agents: markdown with YAML frontmatter (confirmed)
   - Skills: JSON or markdown? (TBD)
   - Commands: format? (TBD)
   - Output styles: markdown with frontmatter? (TBD)
5. **Security**: Path validation to prevent directory traversal attacks (pattern from spec-awareness.ts isValidFeaturePath)
6. **Error handling**: Missing directories, permission errors (EACCES), and invalid file formats must not crash the plugin

## Open Questions

1. What is the file format for skill definitions? JSON (current loadSkillRules expectation) or markdown with frontmatter?
2. What format do command definitions use in ~/.claude/commands/?
3. What format do output styles use in ~/.claude/output-styles/?
4. Should plugin directory scanning be recursive beyond one level (e.g., ~/.claude/plugins/*/skills/ or deeper)?
5. Should commands be included in initial scope, or deferred to v1.3.0?
6. Performance: Is 2s timeout per directory scan appropriate, or should it be lower for better responsiveness?

## Acceptance Criteria

- All user stories implemented with 100% test coverage
- Tests verify filesystem scanning, caching, keyword matching, and context injection
- Integration follows established patterns (async gathering, formatting, options interface)
- Performance: No noticeable latency increase (<100ms added to hook execution time)
- Documentation: README updated to explain dynamic discovery and directory structure
- Constitution compliance: Follows P2 (Test-First Development), P5 (Simplicity & YAGNI), P6 (Semantic Versioning - MINOR bump to 1.2.0)
```

---

## Suggested Plan Prompt

Use this as the argument for `/speckit:plan`:

```
Technology and Architecture Guidance for Dynamic Context Injection v1.2.0

## Technology Choices

**Filesystem Scanning**:
- Use Node.js native `fs.readdir()` with `{ recursive: true, withFileTypes: true }` options
- `withFileTypes` returns `Dirent` objects, avoiding extra `stat()` syscalls for file type checks
- Async/await approach for recursive directory scanning
- Error handling: catch ENOENT (not found), EACCES (permission denied), ENOTDIR (not a directory)
- Symlinks: Don't follow by default to prevent infinite loops

**YAML Parsing**:
- Reuse existing `parseFrontmatter()` function from spec-awareness.ts
- No external dependencies (gray-matter, vfile-matter not needed)
- Handles common YAML patterns: key: value, arrays with - prefix
- Fallback: Invalid frontmatter treated as empty metadata

**Caching Strategy**:
- LRU cache with mtime-based invalidation (pattern from spec-awareness.ts)
- Cache structure: `Map<string, CacheEntry>` where key = directory path
- `CacheEntry = { items: T[], mtimeMs: number }`
- Max cache size: 50 entries (constant `MAX_CACHE_SIZE`)
- Eviction: Oldest entry removed when cache exceeds limit
- Invalidation: Compare current mtime with cached mtime on every access

**Keyword Matching**:
- Use existing `matchItemsByKeywords()` utility from keyword-matcher.ts
- Scoring: Number of matched keywords = relevance score
- Sorting: Most relevant items first (descending score)
- Case-insensitive matching

## Architectural Approach

**Integration Structure** (follows established pattern):

Create `hooks/src/integrations/dynamic-discovery.ts`:

```typescript
// Main types
export interface DynamicDiscoveryOptions {
  readonly enabled?: boolean;
  readonly prompt?: string;
  readonly _mockFileSystem?: Record<string, string | null>;
}

export interface DynamicContext {
  readonly agents: readonly AgentDefinition[];
  readonly skills: readonly SkillRule[];
  // ... other discovered items
}

// Main functions
export async function gatherDynamicContext(
  options: DynamicDiscoveryOptions
): Promise<DynamicDiscoveryResult>;

export function formatDynamicContext(context: DynamicContext): string;

// Cache management
function getCachedItems<T>(dirPath: string): T[] | null;
function setCachedItems<T>(dirPath: string, items: T[]): void;
function clearCache(): void; // For testing
```

**Integration with context-builder.ts**:

Add dynamic discovery to async tasks in `buildAsyncTasks()`:

```typescript
if (dynamicOptions && dynamicOptions.enabled !== false) {
  tasks.push(
    createAsyncTask(
      () => gatherDynamicContext({ ...dynamicOptions, prompt }),
      (ctx) => {
        // Populate agentDefinitions and skillRules from discovered items
        results.agents = ctx.agents;
        results.skills = ctx.skills;
        sources.push('dynamic-discovery');
      }
    )
  );
}
```

**Special Case: memory think Detection**:

In `gatherDynamicContext()`:
1. Check if `prompt.includes('memory think')`
2. If true, scan agents and output-styles directories
3. Format special injection: "💡 Tip: Consider using --agent <name> for expertise or --style <name> for perspective"
4. Limit to top 3-5 most relevant based on prompt keywords

**Directory Scanning Algorithm**:

```typescript
async function scanDirectory<T>(
  dirPath: string,
  parser: (content: string, filename: string) => T | null
): Promise<T[]> {
  // 1. Check cache with mtime validation
  // 2. If cache miss or stale, scan directory
  // 3. Use fs.readdir({ withFileTypes: true })
  // 4. Filter .md files (or .json for skills)
  // 5. Read and parse each file
  // 6. Update cache with new items and current mtime
  // 7. Return items
}
```

## Key Technical Considerations

1. **Performance**: Filesystem I/O is expensive. Cache aggressively, but invalidate correctly with mtime checks.

2. **Error Resilience**: Directory scanning must never crash the plugin. Wrap all I/O in try-catch, log failures to stderr, continue with empty results.

3. **Testing Strategy**:
   - Unit tests: Test scanning, parsing, caching, keyword matching in isolation
   - Integration tests: Test full gather → format → inject flow with mock filesystem
   - Use `_mockFileSystem` option to avoid real I/O in tests
   - Test cache invalidation with mtime simulation

4. **Path Expansion**: Expand `~` to `process.env.HOME` for global paths

5. **Merge Strategy**: When same agent/skill exists in both global and local directories, prefer local version (more specific to project)

6. **XML Escaping**: All injected content must be XML-escaped (pattern from existing integrations)

## Dependencies and Risks

**Dependencies**: None (reuses existing utilities)

**Risks**:
- Performance degradation if directories contain many files (mitigated by caching)
- File format inconsistencies if agents/skills don't follow expected structure (mitigated by robust parsing with fallbacks)
- Cache invalidation bugs causing stale suggestions (mitigated by thorough testing of mtime logic)
- Symlink loops in plugin directories (mitigated by not following symlinks)

**Mitigation**:
- Comprehensive test coverage (P2: Test-First Development)
- Performance benchmarks in tests (verify <100ms overhead)
- Clear error messages when parsing fails
- Timeout on directory scanning (2s limit)

## Constitution Alignment

- **P2 (Test-First Development)**: Write tests before implementation, group all test tasks before implementation tasks
- **P5 (Simplicity & YAGNI)**: No new dependencies, reuse existing utilities, start with core functionality
- **P6 (Semantic Versioning)**: MINOR version bump (1.1.x → 1.2.0) - new feature, backwards compatible

## Implementation Phases

Suggested phasing (defer to Planner agent for final breakdown):

1. **Phase 1: Filesystem scanning infrastructure** - Directory scanner, cache, tests
2. **Phase 2: Agent discovery** - Agent parsing, keyword matching, injection
3. **Phase 3: Skill discovery** - Skill parsing (format TBD), matching, injection
4. **Phase 4: memory think special case** - Detection, style/agent suggestion
5. **Phase 5: Integration and configuration** - Wire into context-builder, config toggle, documentation
```

---

## Research Notes

### Architectural Approach

**Recommended**: Create new `integrations/dynamic-discovery.ts` following established integration pattern

**Rationale**:
- Consistency with existing git-context, spec-awareness, lsp-diagnostics, memory-plugin integrations
- Testable in isolation with `_mockFileSystem` mock support
- Async gathering fits into existing Promise.allSettled pattern in context-builder
- Clear separation of concerns: discovery (integration) vs matching (existing utilities)

**Alternatives Considered**:
- **Option A: Scan in hook entry point (improve-prompt.ts)** - Pros: Simple, no new files / Cons: Violates single responsibility, harder to test, mixes concerns
- **Option B: Extend skill-matcher and agent-suggester directly** - Pros: Fewer files / Cons: Mixes filesystem I/O with pure matching logic, harder to mock for testing

### Technology Evaluation

**Recommended Filesystem Scanning**:
- **Node.js fs.readdir({ recursive: true, withFileTypes: true })**: Native support, no dependencies, efficient
- **Purpose**: Discover agent/skill/command/style files in directories

**Alternatives**:
- **readdirp package**: More features (filtering, streaming) but adds dependency
- **glob package**: Pattern matching but slower and adds dependency
- **Custom recursive walker**: Reinventing the wheel, violates YAGNI principle

**Recommended YAML Parsing**:
- **Existing parseFrontmatter()**: Already handles simple YAML, zero dependencies
- **Purpose**: Parse agent metadata (name, description, keywords)

**Alternatives**:
- **gray-matter**: Industry standard, battle-tested, but adds ~100KB dependency
- **vfile-matter**: TypeScript-first, but adds dependency
- **js-yaml**: Full YAML parser, overkill for simple frontmatter

### Key Considerations

**Performance**:
- Filesystem I/O is the bottleneck (not parsing)
- Caching reduces I/O from O(prompts) to O(file changes)
- LRU eviction prevents unbounded memory growth
- mtime checking is cheap compared to file reading
- Expected overhead: <50ms per prompt (mostly cache hits)

**Security**:
- Path traversal: Validate paths don't contain `..` sequences
- Symlink attacks: Don't follow symlinks during discovery
- Permission errors: Catch EACCES/EPERM, continue gracefully
- Malicious frontmatter: Parser handles invalid YAML safely (returns empty object)

**Complexity**:
- Low: Reuses 80% of existing infrastructure (parseFrontmatter, matchItemsByKeywords, cache pattern)
- Medium: Directory scanning and cache management (new code, but well-established patterns)
- Low: Integration point (follows existing pattern exactly)

**Testing**:
- High confidence: `_mockFileSystem` allows full integration testing without real I/O
- Cache testing: Simulate mtime changes to verify invalidation
- Error scenarios: Missing dirs, permission errors, invalid formats

### Open Questions

1. **Skill file format**: Current `loadSkillRules()` expects JSON with `{ skills: [...] }` structure. Is this the format used in `~/.claude/skills/`? Or should we support markdown with frontmatter like agents?

2. **Command format**: What structure do command definitions use? Markdown? JSON? Shell scripts?

3. **Output style format**: Markdown with frontmatter describing formatting preferences? JSON? Need example files to determine.

4. **Plugin nesting depth**: Should plugin skill discovery be recursive (e.g., `~/.claude/plugins/*/subdir/skills/`) or just one level deep?

5. **Command inclusion**: Should commands be discovered and suggested, or is that scope creep for v1.2.0? (Could defer to v1.3.0)

6. **Performance threshold**: Is <100ms acceptable overhead? Or should target be more aggressive (<50ms)?

---

## Next Steps

1. Review the suggested prompts above
2. **Investigate open questions** about file formats:
   - Check actual files in `~/.claude/skills/`, `~/.claude/commands/`, `~/.claude/output-styles/`
   - Determine expected structure for each type
3. Run `/speckit:specify` with the suggested specify prompt (adjust if needed after investigation)
4. Run `/speckit:plan` with the suggested plan prompt
5. Use memory skill to retrieve research notes during planning:
   ```bash
   memory get decision-dynamic-context-injection-v1-2-0-exploration-phase
   ```

---

## Sources

Research was conducted using the following sources:

- [Node.js v25.3.0 Documentation - File system](https://nodejs.org/api/fs.html)
- [Node.js — Working with folders in Node.js](https://nodejs.org/en/learn/manipulating-files/working-with-folders-in-nodejs)
- [Node.js fs.readdir() Method: Practical, Production-Ready Guide – TheLinuxCode](https://thelinuxcode.com/nodejs-fsreaddir-method-practical-production-ready-guide/)
- [Node.js fs.readdir() Method: Reliable Directory Scans in Real Projects – TheLinuxCode](https://thelinuxcode.com/nodejs-fsreaddir-method-reliable-directory-scans-in-real-projects/)
- [GitHub - jonschlinkert/gray-matter: YAML front matter parser](https://github.com/jonschlinkert/gray-matter)
- [GitHub - vfile/vfile-matter: utility to parse the YAML front matter in a vfile](https://github.com/vfile/vfile-matter)
- [GitHub - remarkjs/remark-frontmatter: remark plugin to support frontmatter](https://github.com/remarkjs/remark-frontmatter)

Internal codebase analysis:
- `/hooks/src/integrations/spec-awareness.ts` - LRU cache pattern with mtime validation
- `/hooks/src/integrations/git-context.ts` - Integration pattern reference
- `/hooks/src/integrations/memory-plugin.ts` - Plugin discovery pattern
- `/hooks/src/context/agent-suggester.ts` - Agent parsing and keyword extraction
- `/hooks/src/context/skill-matcher.ts` - Skill matching logic
- `/hooks/src/utils/keyword-matcher.ts` - Shared keyword matching utility
- `/hooks/src/context/context-builder.ts` - Async gathering with Promise.allSettled

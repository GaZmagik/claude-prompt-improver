---
user_stories:
  - id: "US1"
    title: "Agent Discovery"
    priority: "P1"
    independently_testable: true
  - id: "US2"
    title: "Multi-Source Discovery"
    priority: "P1"
    independently_testable: true
  - id: "US3"
    title: "Memory Think Special Case"
    priority: "P2"
    independently_testable: true
  - id: "US4"
    title: "Integration Pattern Compliance"
    priority: "P1"
    independently_testable: true
  - id: "US5"
    title: "Performance"
    priority: "P2"
    independently_testable: true
---

# Feature Specification: Dynamic Context Injection v1.3.0

**Feature Branch**: `feature/002-dynamic-context-injection`
**Created**: 2026-01-21
**Status**: Draft
**Input**: User description: "The Claude Prompt Improver plugin must dynamically discover and inject suggestions for available agents, skills, commands, and output styles by scanning the filesystem at runtime, replacing the current hardcoded approach."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Discovery (Priority: P1)

As a plugin user, I want the prompt improver to automatically discover agents in `~/.claude/agents/` and `.claude/agents/` so that relevant agent suggestions are injected without manual configuration.

**Why this priority**: This is the foundation of dynamic discovery. Without agent discovery, the core value proposition (automatic detection of available tools) is not delivered. This story is the minimal viable product that demonstrates the filesystem scanning approach works and delivers immediate value by suggesting agents based on user prompts.

**Independent Test**: Can be fully tested by creating mock agent markdown files with frontmatter, submitting prompts with matching keywords, and verifying that matched agents are suggested in the improved prompt. Works standalone without requiring skills, commands, or output styles discovery. Delivers value by making users aware of specialised agents they may not know exist.

**Acceptance Scenarios**:

1. **Given** agent files exist in `~/.claude/agents/typescript-expert.md` and `.claude/agents/react-specialist.md` with frontmatter containing names and descriptions, **When** a prompt contains keywords "typescript" or "interface", **Then** the typescript-expert agent is suggested in the improved prompt context.

2. **Given** an agent file with frontmatter `name: "Database Architect"` and `description: "PostgreSQL schema design and optimisation"`, **When** a prompt contains "database" or "schema" or "postgres", **Then** this agent is matched and suggested.

3. **Given** both global (`~/.claude/agents/`) and local (`.claude/agents/`) agent directories exist with different agents, **When** agents are discovered, **Then** both directories are scanned and all valid agents are available for matching.

4. **Given** an agent markdown file with malformed frontmatter or missing description, **When** the file is parsed, **Then** it is skipped gracefully without crashing the discovery process.

5. **Given** the `~/.claude/agents/` directory does not exist, **When** agent discovery runs, **Then** the plugin handles the missing directory gracefully and continues with other discovery sources.

---

### User Story 2 - Multi-Source Discovery (Priority: P1)

As a plugin user, I want the prompt improver to discover skills, commands, and output styles from multiple sources so that suggestions adapt to my installed plugins.

**Why this priority**: Extends the discovery pattern to all resource types. Once agent discovery (US1) proves the pattern works, this story scales it horizontally to commands, skills, and output styles. Essential for completeness of the dynamic discovery feature and delivers proportionate value for each resource type discovered.

**Independent Test**: Can be fully tested by creating mock directory structures for `~/.claude/commands/`, `~/.claude/skills/`, and `~/.claude/output-styles/`, populating them with test definitions, and verifying that relevant items are matched to prompts. Each resource type can be tested independently. Delivers comprehensive awareness of user's installed plugins.

**Acceptance Scenarios**:

1. **Given** command definitions in `~/.claude/commands/commit.md` and `~/.claude/commands/review.md` with frontmatter describing their purpose, **When** a prompt contains "commit" or "git", **Then** the commit command is suggested.

2. **Given** output style definitions in `~/.claude/output-styles/concise.md` and `~/.claude/output-styles/verbose.md`, **When** a prompt requests "brief" or "detailed" responses, **Then** the appropriate output style is suggested.

3. **Given** skill directories in `~/.claude/skills/memory/` and `~/.claude/skills/search/`, **When** skills are discovered, **Then** skill metadata is extracted from skill definition files or directory structure.

4. **Given** multiple sources (agents, commands, skills, output styles) are being scanned, **When** any single source fails or times out, **Then** the discovery continues with remaining sources using Promise.allSettled pattern.

5. **Given** a command file exists but contains no frontmatter, **When** parsed, **Then** keywords are extracted from the filename as a fallback mechanism.

---

### User Story 3 - Memory Think Special Case (Priority: P2)

As a plugin user, when I use memory think commands, I want suggestions for available agents and output styles to enhance my deliberation.

**Why this priority**: Valuable enhancement for users of the memory plugin but depends on US1 and US2 being complete. This is a special case that demonstrates intelligent context-aware suggestions. Not critical for core dynamic discovery functionality but significantly improves the memory think workflow when implemented.

**Independent Test**: Can be fully tested by submitting prompts matching "memory think" patterns and verifying that agent and output style suggestions are formatted differently with explanatory text about using `--agent` and `--style` flags. Standalone feature that integrates with existing discovery. Delivers targeted value for memory think users.

**Acceptance Scenarios**:

1. **Given** a prompt containing "memory think create 'API design decisions'", **When** the prompt is improved, **Then** suggestions include: "Consider using --agent <name> for domain expertise or --style <name> for perspective".

2. **Given** discovered agents include "security-expert" and "api-architect", and a memory think prompt about "API authentication", **When** agents are matched, **Then** the top 3-5 most relevant agents are suggested based on keyword matching.

3. **Given** discovered output styles include "socratic" and "devil's-advocate", and a memory think prompt is detected, **When** styles are suggested, **Then** they are formatted with usage examples showing the `--style` flag syntax.

4. **Given** a memory think prompt but no matching agents or styles are found, **When** suggestions are generated, **Then** generic guidance is provided without empty lists.

5. **Given** a memory think prompt like "memory think add 'consideration about performance'", **When** processed, **Then** special formatting distinguishes memory think suggestions from regular context injection.

---

### User Story 4 - Integration Pattern Compliance (Priority: P1)

As a developer, I want filesystem scanning to follow existing integration patterns so that the feature is consistent, testable, and maintainable.

**Why this priority**: Architectural compliance is non-negotiable. This ensures the implementation integrates cleanly with the existing codebase, follows established patterns (like spec-awareness.ts and memory-plugin.ts), and maintains code quality standards. Without this, technical debt accumulates and future maintenance becomes costly.

**Independent Test**: Can be fully tested by code review, verifying file structure matches conventions, confirming Promise.allSettled usage for async gathering, validating _mockFileSystem option works in tests, and running integration test suite. Delivers long-term maintainability value.

**Acceptance Scenarios**:

1. **Given** the new integration file `hooks/src/integrations/dynamic-discovery.ts`, **When** reviewed, **Then** it exports `gatherDynamicContext()`, `formatDynamicContext()`, and `DynamicDiscoveryOptions` interface following the established pattern.

2. **Given** the dynamic discovery integration, **When** called from `context-builder.ts`, **Then** it is integrated using Promise.allSettled alongside git, LSP, spec, and memory integrations.

3. **Given** tests for dynamic discovery in `hooks/src/integrations/dynamic-discovery.spec.ts`, **When** executed, **Then** they use the `_mockFileSystem` option to test without real filesystem access.

4. **Given** the integration exports a result interface, **When** gathering fails, **Then** the result includes `success: false`, an optional `error` field, and optional `skipped`/`skipReason` fields for graceful degradation.

5. **Given** comprehensive TDD test coverage, **When** all tests run, **Then** every function in dynamic-discovery.ts has corresponding test coverage including edge cases and error paths.

---

### User Story 5 - Performance (Priority: P2)

As a plugin user, I want dynamic discovery to be performant so that prompt improvement doesn't introduce noticeable latency.

**Why this priority**: Important for user experience but can be optimised after proving correctness (US1, US2, US4). Initial implementation can be slower if it works correctly. Performance optimisation is valuable but not blocking for MVP delivery. Caching and timeout handling prevent worst-case scenarios.

**Independent Test**: Can be fully tested by measuring discovery latency with mock filesystems of varying sizes, verifying cache hits reduce repeated scans, confirming mtime-based invalidation works correctly, and validating timeout enforcement. Performance benchmarks are independent of correctness tests. Delivers responsive user experience.

**Acceptance Scenarios**:

1. **Given** agents have been discovered previously, **When** the same agents are accessed again without file modifications, **Then** the LRU cache returns cached results without filesystem scanning.

2. **Given** an agent file's mtime (modification time) has changed, **When** the file is accessed from cache, **Then** the cache entry is invalidated and the file is re-read and re-parsed.

3. **Given** the cache contains 50 entries (MAX_CACHE_SIZE), **When** a new entry is added, **Then** the least recently used entry is evicted following LRU policy.

4. **Given** a directory scan operation, **When** scanning takes longer than 2 seconds, **Then** the operation times out and returns partial results or fails gracefully.

5. **Given** Node.js fs.readdir with `{ withFileTypes: true }` option, **When** scanning directories, **Then** file type information is obtained efficiently without additional stat calls.

---

### Edge Cases

- **What happens when both global and local directories contain agents with the same filename?** Local agents (`.claude/agents/`) should take precedence over global agents (`~/.claude/agents/`) to allow users to override global definitions. The discovery process should detect duplicates by normalised name and keep only the local version.

- **What happens when an agent markdown file has YAML frontmatter but the YAML is malformed?** The `parseFrontmatter()` function should handle YAML parsing errors gracefully, logging a warning about the malformed file, and skipping that agent without crashing the entire discovery process.

- **What happens when a directory contains hundreds of agent files?** The LRU cache with MAX_CACHE_SIZE limit prevents memory exhaustion. Directory scans should implement pagination or limit reading to the first N files (configurable limit), and the 2-second timeout prevents indefinite scanning.

- **What happens when a prompt matches keywords for 10+ agents/commands/styles?** The suggestion formatter should limit output to the top 3-5 most relevant matches based on keyword match score to avoid overwhelming the improved prompt with suggestions.

- **What happens when the user has no `.claude/` directory at all?** The discovery process should detect missing directories gracefully (using existsSync checks) and continue with other sources. Missing directories are not errors, just empty result sets.

- **What happens when a frontmatter description field is extremely long (1000+ characters)?** Keyword extraction should truncate descriptions to a reasonable length (e.g., first 500 characters) before processing to prevent performance degradation from regex matching on massive strings.

- **What happens when concurrent prompts trigger parallel discovery scans?** The cache should be thread-safe (or discovery should use a mutex/lock) to prevent race conditions where multiple scans try to update the same cache entry simultaneously.

- **What happens when symlinks exist in agent directories pointing to files outside the expected paths?** Directory scanning should follow symlinks (default fs.readdir behaviour) but path validation should reject any resolved paths containing ".." to prevent directory traversal attacks via symlinks.

- **What happens when a memory think prompt doesn't specify a topic (e.g., just "memory think")?** The special case suggestion should still trigger, providing general guidance about available agents/styles even without specific keyword matching, since the user is entering a deliberative mode.

- **What happens when the plugin is run on Windows vs Linux/macOS?** Path handling must be cross-platform using Node.js path.join() and path.resolve(). Home directory resolution (`~/.claude/`) must use os.homedir() for correct expansion on all platforms.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan both global (`~/.claude/agents/`) and local (`.claude/agents/`) directories for agent markdown files with `.md` extension.

- **FR-002**: System MUST parse markdown frontmatter from discovered files using the existing `parseFrontmatter()` function from `spec-awareness.ts` to extract metadata including name, description, and optional keywords.

- **FR-003**: System MUST extract keywords from agent definitions:
  - Explicit keywords from frontmatter `keywords` field if present
  - Fallback to extracting keywords from description text using the pattern from `agent-suggester.ts::extractKeywords()`
  - Fallback to filename (without .md extension) if frontmatter is missing

- **FR-004**: System MUST match discovered agents to user prompts using the existing `matchItemsByKeywords()` utility from `keyword-matcher.ts`.

- **FR-005**: System MUST scan multiple resource type directories:
  - Commands: `~/.claude/commands/` and `.claude/commands/`
  - Output styles: `~/.claude/output-styles/` and `.claude/output-styles/`
  - Skills: `~/.claude/skills/` and `.claude/skills/`
  - Agents: `~/.claude/agents/` and `.claude/agents/` (from US1)

- **FR-006**: System MUST detect "memory think" pattern in user prompts using regex matching for variations:
  - `memory think create`
  - `memory think add`
  - `memory think counter`
  - `memory think branch`
  - `memory think conclude`

- **FR-007**: System MUST format memory think suggestions differently from regular context injection:
  - Include suggestion text: "Consider using --agent <name> for domain expertise or --style <name> for perspective"
  - List top 3-5 most relevant agents/styles based on prompt keywords
  - Show usage examples with `--agent` and `--style` flag syntax

- **FR-008**: System MUST implement caching with mtime-based invalidation following the pattern from `spec-awareness.ts`:
  - LRU cache with MAX_CACHE_SIZE = 50 entries
  - Cache key: absolute file path
  - Cache value: parsed content + mtime timestamp
  - Cache invalidation: compare current file mtime with cached mtime

- **FR-009**: System MUST handle local/global precedence:
  - When same-named resources exist in both global and local directories
  - Local version takes precedence (e.g., `.claude/agents/expert.md` overrides `~/.claude/agents/expert.md`)
  - Deduplication by normalised resource name (case-insensitive, stripped of extension)

- **FR-010**: System MUST integrate into `context-builder.ts` following the Promise.allSettled pattern used for existing integrations (git, LSP, spec, memory).

- **FR-011**: System MUST provide `_mockFileSystem` option in DynamicDiscoveryOptions interface for testing without real filesystem access, following the pattern from SpecAwarenessOptions.

- **FR-012**: System MUST respect configuration toggle:
  - Configuration field: `integrations.dynamicDiscovery: boolean` (default: true)
  - When disabled, all discovery is skipped and function returns early with `skipped: true`

- **FR-013**: System MUST validate paths to prevent directory traversal attacks:
  - Reject paths containing ".." sequences
  - Reject paths containing null bytes (\0)
  - Allow only safe characters: alphanumeric, hyphens, underscores, forward slashes, dots, colons (Windows compatibility)
  - Use the `isValidFeaturePath()` pattern from `spec-awareness.ts`

- **FR-014**: System MUST use efficient filesystem operations:
  - Use `fs.readdir()` with `{ withFileTypes: true }` option to get file types without additional stat() calls
  - Use `fs.statSync()` only when needed for mtime validation
  - Batch read operations where possible

- **FR-015**: System MUST enforce timeouts:
  - Per-directory scan timeout: 2 seconds maximum
  - On timeout, log warning and return partial results (discovered items before timeout)
  - Never block indefinitely on filesystem operations

- **FR-016**: System MUST handle filesystem errors gracefully:
  - Missing directories: skip silently, not an error condition
  - Permission errors: log warning, skip directory
  - Read errors on individual files: log warning, skip file, continue with remaining files
  - Never crash or throw uncaught exceptions due to filesystem issues

- **FR-017**: System MUST limit suggestion output:
  - Maximum 5 matched items per resource type in formatted context
  - Sorted by keyword match score (highest first)
  - If >5 matches, take top 5 and optionally note "and N more available"

- **FR-018**: System MUST use cross-platform path handling:
  - Use `path.join()` and `path.resolve()` for path construction
  - Use `os.homedir()` for resolving `~` in paths
  - Support both forward slash and backslash separators (Windows)

### Key Entities

- **DiscoveredItem**: A resource found during filesystem scanning
  - Attributes: name, description, keywords, filePath, resourceType (agent|command|skill|outputStyle), source (global|local)
  - Relationships: multiple DiscoveredItems are matched to Prompt via keyword matching

- **DiscoveryCache**: LRU cache for parsed resource definitions
  - Attributes: cacheKey (absolute path), content (parsed item), mtimeMs (modification timestamp), lastAccessed (for LRU eviction)
  - Relationships: maps file paths to DiscoveredItems to avoid redundant parsing

- **DynamicContext**: Aggregated discovery results for prompt injection
  - Attributes: matchedAgents, matchedCommands, matchedSkills, matchedOutputStyles, isMemoryThinkContext (boolean)
  - Relationships: derived from DiscoveredItems matched to Prompt, injected into ImprovedPrompt

- **ResourceDirectory**: A filesystem location scanned for resources
  - Attributes: path (absolute), type (agent|command|skill|outputStyle), scope (global|local), exists (boolean)
  - Relationships: contains multiple DiscoveredItems

- **MemoryThinkContext**: Special formatting context for memory think prompts
  - Attributes: promptPattern (regex matched), suggestedAgents, suggestedStyles, usageGuidance (formatted text)
  - Relationships: specialised subtype of DynamicContext when memory think pattern detected

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agents, commands, skills, and output styles are discovered automatically from filesystem without manual configuration in 100% of test cases where valid markdown files with frontmatter exist.

- **SC-002**: Discovery process completes within 2 seconds per directory under normal conditions (≤100 files per directory) in 95% of scans.

- **SC-003**: Cache hit rate reaches 80%+ for repeated prompt improvements within the same session when files have not been modified.

- **SC-004**: Local resources (`.claude/`) correctly override global resources (`~/.claude/`) in 100% of test cases where duplicate names exist.

- **SC-005**: Discovery handles missing directories gracefully with zero crashes or uncaught exceptions in 100% of test cases.

- **SC-006**: Memory think prompts receive specialised suggestions with agent/style recommendations in 100% of test cases where "memory think" pattern is detected.

- **SC-007**: Integration test coverage reaches 100% for all exported functions in `dynamic-discovery.ts` with tests using `_mockFileSystem` option.

- **SC-008**: Path validation rejects all directory traversal attempts (paths containing "..") in 100% of security test cases.

- **SC-009**: Discovery integrates into `context-builder.ts` using Promise.allSettled pattern without blocking other integrations on timeout or failure in 100% of error scenarios.

- **SC-010**: Configuration toggle `integrations.dynamicDiscovery: false` disables all discovery operations and returns early in 100% of test cases.

- **SC-011**: Cross-platform compatibility verified on Linux, macOS, and Windows with path handling tests passing on all platforms.

## Assumptions *(mandatory)*

- **A-001**: Agent, command, skill, and output style definitions follow a consistent markdown format with YAML frontmatter containing at minimum a `description` field.

- **A-002**: The existing `parseFrontmatter()` function in `spec-awareness.ts` is sufficient for parsing frontmatter from all resource types (agents, commands, skills, output styles).

- **A-003**: Users accept that the first prompt improvement after plugin start or file modification may be slower due to discovery scanning, but subsequent prompts benefit from caching.

- **A-004**: The `~/.claude/` directory is the standard location for global Claude Code resources, and `.claude/` in the working directory is the standard location for project-local resources.

- **A-005**: The Node.js filesystem APIs (fs.readdir, fs.statSync, fs.readFileSync) are performant enough for scanning directories with <1000 files without significant latency.

- **A-006**: The keyword matching algorithm from `keyword-matcher.ts` provides sufficient relevance scoring for matching resources to prompts without requiring semantic similarity models.

- **A-007**: Users organise their skills as directories containing skill definition files (not loose files), allowing discovery via directory scanning.

- **A-008**: The memory plugin's "memory think" command variations are stable and won't change significantly, making regex-based detection reliable.

- **A-009**: File modification times (mtime) are reliable indicators of content changes for cache invalidation purposes across all supported platforms.

- **A-010**: The maximum number of resources (agents + commands + skills + output styles) a user will have installed is reasonable (<1000 total) for in-memory caching without exhausting memory.

## Out of Scope *(mandatory)*

- **OOS-001**: Recursive directory scanning - only top-level files in each resource directory are scanned, not subdirectories (except for skills which are inherently directory-based).

- **OOS-002**: Hot-reload or filesystem watching - cache invalidation relies on mtime checks at access time, not real-time file watching.

- **OOS-003**: Semantic similarity matching - keyword matching only, no LLM-based relevance scoring or embeddings-based similarity.

- **OOS-004**: Discovery of resources from non-standard locations - only scans `~/.claude/` and `.claude/` directories, not arbitrary user-specified paths.

- **OOS-005**: Version conflict resolution - if multiple versions of the same resource exist, simple precedence rules apply (local > global), not semantic versioning comparison.

- **OOS-006**: Plugin dependency resolution - discovery doesn't check if a discovered command/skill belongs to an installed plugin or if dependencies are met.

- **OOS-007**: Resource validation beyond frontmatter parsing - no validation that agents/commands actually work, only that markdown files are parseable.

- **OOS-008**: Internationalisation - keyword matching is English-only, no multi-language support for descriptions or keywords.

- **OOS-009**: User feedback on suggestion relevance - no mechanism to learn from user acceptance/rejection of suggestions to improve future matching.

- **OOS-010**: Discovery telemetry or analytics - no tracking of which resources are discovered, matched, or suggested for usage analysis.

## Dependencies *(mandatory)*

- **DEP-001**: Node.js built-in modules: `fs`, `path`, `os` for filesystem operations and path handling.

- **DEP-002**: Existing `parseFrontmatter()` function from `hooks/src/integrations/spec-awareness.ts` for YAML frontmatter parsing.

- **DEP-003**: Existing `matchItemsByKeywords()` utility from `hooks/src/utils/keyword-matcher.ts` for keyword-based matching.

- **DEP-004**: Existing `extractKeywords()` pattern from `hooks/src/context/agent-suggester.ts` for deriving keywords from descriptions.

- **DEP-005**: Existing integration patterns from `context-builder.ts` for Promise.allSettled-based async gathering.

- **DEP-006**: Configuration system supporting `integrations.dynamicDiscovery` boolean toggle.

- **DEP-007**: Filesystem access permissions to read from `~/.claude/` (global) and `.claude/` (local) directories.

- **DEP-008**: TypeScript runtime environment (Bun) with support for modern ES modules and async/await.

## Open Questions *(mandatory)*

- **OQ-001**: Should the LRU cache MAX_CACHE_SIZE of 50 entries be configurable by users, or is a hardcoded constant sufficient? Consider that each cached entry is small (parsed markdown frontmatter), so 50 may be conservative.

- **OQ-002**: How should the system handle skills discovery differently from agents/commands/output styles given that skills are directory-based? Should it look for a skill.json or package.json file within each skill directory?

- **OQ-003**: Should discovered resources be cached at the collection level (all agents together) or individual file level? Collection-level caching is simpler but invalidates more often; file-level caching is more granular but more complex.

- **OQ-004**: What should the keyword extraction fallback hierarchy be when frontmatter is missing or malformed? Current assumption: explicit keywords > description keywords > filename. Should there be additional fallbacks?

- **OQ-005**: Should the memory think detection be exact pattern matching or fuzzy matching? Current approach uses regex for variations, but should it also match "memory deliberate" or other synonyms?

- **OQ-006**: How should the system prioritise multiple context sources when total context size is limited? Should dynamic discovery suggestions take precedence over git/LSP/spec context, or vice versa?

- **OQ-007**: Should local resources completely hide global resources with the same name, or should both be available with a naming convention to distinguish them (e.g., "expert (local)" vs "expert (global)")?

- **OQ-008**: What is the appropriate timeout value for per-directory scans? Currently specified as 2 seconds - should this be configurable or adaptive based on directory size?

---

**Feature**: 002 | **Status**: Draft | **Created**: 2026-01-21

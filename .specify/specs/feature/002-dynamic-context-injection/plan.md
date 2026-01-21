---
phases:
  - id: 0
    name: "Research & Technical Decisions"
    description: "Validate technology choices and integration patterns"
    maps_to: []
  - id: 1
    name: "Filesystem Scanning Infrastructure"
    description: "Core directory scanning, caching, and path validation"
    maps_to: ["US4", "US5"]
  - id: 2
    name: "Agent Discovery"
    description: "Agent scanning, parsing, and keyword matching"
    maps_to: ["US1", "US4"]
  - id: 3
    name: "Multi-Source Discovery"
    description: "Commands, skills, and output styles discovery"
    maps_to: ["US2", "US4"]
  - id: 4
    name: "Memory Think Special Case"
    description: "Detect memory think patterns and format suggestions"
    maps_to: ["US3"]
  - id: 5
    name: "Integration & Configuration"
    description: "Wire into context-builder.ts and add config toggle"
    maps_to: ["US4"]
---

# Implementation Plan: Dynamic Context Injection v1.3.0

**Branch**: `feature/v1.3.0-dynamic-context-injection` | **Date**: 2026-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/specs/feature/002-dynamic-context-injection/spec.md`

## Summary

This feature replaces the current hardcoded agent/command/skill/output-style suggestions with a dynamic filesystem-based discovery system. The plugin will scan `~/.claude/` (global) and `.claude/` (local) directories at runtime to discover available resources, parse their frontmatter metadata, match them to user prompts via keyword matching, and inject relevant suggestions into the improved prompt context.

**Core Value**: Users receive contextual suggestions for agents, commands, skills, and output styles they actually have installed, without manual configuration updates when they install new plugins.

**Technical Approach**: Create `hooks/src/integrations/dynamic-discovery.ts` following the established pattern from `spec-awareness.ts` and `memory-plugin.ts`. Use Node.js native filesystem APIs with LRU caching, integrate via Promise.allSettled in `context-builder.ts`, and reuse existing utilities (`parseFrontmatter`, `matchItemsByKeywords`, `extractKeywords`).

## Technical Context

**Language/Version**: TypeScript (via Bun 1.3.6 runtime), Node.js v22.21.1 compatibility
**Primary Dependencies**:
- Node.js built-in modules: `fs`, `path`, `os`
- Existing utilities: `parseFrontmatter()`, `matchItemsByKeywords()`, `extractKeywords()`
- Existing patterns: `spec-awareness.ts` (caching, _mockFileSystem), `memory-plugin.ts` (multi-path discovery)

**Storage**: Filesystem scanning with in-memory LRU cache (MAX_CACHE_SIZE=50, mtime-based invalidation)
**Testing**: Bun test framework, `_mockFileSystem` option for integration tests (no real filesystem access)
**Target Platform**: Cross-platform (Linux, macOS, Windows) - uses `os.homedir()` and `path.join()`
**Project Type**: Single TypeScript project (hooks/ directory)
**Performance Goals**:
- Discovery completes within 2 seconds per directory (95% of scans)
- Cache hit rate 80%+ for repeated prompts within same session
- Zero crashes/exceptions on filesystem errors

**Constraints**:
- Must work with Bun's TypeScript runtime
- Must not block other integrations (Promise.allSettled pattern)
- Must handle missing directories gracefully (not an error condition)
- Must validate paths to prevent directory traversal attacks

**Scale/Scope**:
- Expected resource count: <1000 total resources across all types
- Expected directory size: <100 files per directory under normal conditions
- Cache size: 50 entries maximum (reasonable for 1000 resources with hit rate optimisation)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Test-First Gate (P2 - NON-NEGOTIABLE)
- [x] Test strategy defined before implementation planning? **YES** - TDD workflow specified in spec, all phases have test tasks before implementation tasks
- [x] Contract tests specified for integration points? **YES** - Integration with context-builder.ts via Promise.allSettled, DynamicDiscoveryOptions interface with _mockFileSystem
- [x] TDD workflow (Red-Green-Refactor) acknowledged? **YES** - Constitution P2 enforced, test tasks grouped before implementation tasks

### Observability Gate (P4)
- [x] Logging strategy defined for process execution? **YES** - Log warnings for permission errors, missing directories, timeouts
- [x] Memory system updates planned for decisions? **YES** - Memory skill activated, gotchas checked
- [x] CLI outputs support JSON + human-readable formats? **N/A** - This is a context injection feature, not a CLI command

### Simplicity Gate (P5)
- [x] Solving a concrete, documented problem? **YES** - Spec US1-US5 document clear user scenarios
- [x] No speculative "might need this later" features? **YES** - No features beyond spec requirements (e.g., recursive scanning, semantic matching, hot-reload all out of scope)
- [x] Each phase delivers independent value? **YES** - Phase 1 (infrastructure) enables Phase 2 (agents), Phase 2 works standalone, Phase 3 extends horizontally

### Semantic Versioning Gate (P6)
- [x] Version bump appropriate? **YES** - MINOR version bump to 1.3.0 (new backward-compatible feature)

## Project Structure

### Documentation (this feature)

```
.specify/specs/feature/002-dynamic-context-injection/
├── plan.md              # This file
├── research.md          # Phase 0 output (technology validation)
├── data-model.md        # Phase 1 output (TypeScript interfaces)
├── quickstart.md        # Developer setup guide
└── spec.md              # Feature specification (input)
```

### Source Code (repository root)

```
hooks/
├── src/
│   ├── integrations/
│   │   ├── dynamic-discovery.ts          # NEW - Main discovery integration
│   │   ├── dynamic-discovery.spec.ts     # NEW - Integration tests
│   │   ├── spec-awareness.ts             # EXISTING - Reuse parseFrontmatter()
│   │   ├── memory-plugin.ts              # EXISTING - Pattern reference
│   │   └── ...
│   ├── context/
│   │   ├── context-builder.ts            # MODIFY - Add dynamic discovery integration
│   │   ├── agent-suggester.ts            # EXISTING - Reuse extractKeywords()
│   │   └── ...
│   └── utils/
│       ├── keyword-matcher.ts            # EXISTING - Reuse matchItemsByKeywords()
│       ├── file-reader.ts                # EXISTING - Reuse readFileSyncSafe()
│       └── ...
└── ...
```

**Structure Decision**: Follows established single-project TypeScript structure. New integration file `dynamic-discovery.ts` in `integrations/` directory alongside `spec-awareness.ts` and `memory-plugin.ts`. Integration wired into `context-builder.ts` using Promise.allSettled pattern (line 186 in existing code).

## Complexity Tracking

No constitutional violations requiring justification. This feature:
- ✅ Reuses existing utilities (no new dependencies)
- ✅ Follows TDD strictly (test tasks before implementation tasks)
- ✅ Uses established patterns (spec-awareness.ts, memory-plugin.ts)
- ✅ Delivers independent value per phase
- ✅ MINOR version bump (backward-compatible)

---

## Phase 0: Research & Technical Decisions

**Purpose**: Validate technology choices from exploration phase and confirm integration patterns

**Deliverables**:
- research.md - Validation of filesystem APIs, caching strategy, integration approach
- Confirmation that no new dependencies required
- Path validation strategy documented

**Details**:

This phase validates the technology choices provided in the feature request:

1. **Filesystem Scanning API Validation**:
   - Confirm `fs.readdir()` with `{ withFileTypes: true }` works in Bun runtime
   - Verify `Dirent` objects provide file type without extra stat() calls
   - Test cross-platform path handling with `path.join()`, `path.resolve()`, `os.homedir()`
   - Document timeout implementation strategy (Promise.race with setTimeout)

2. **YAML Parsing Confirmation**:
   - Verify existing `parseFrontmatter()` from `spec-awareness.ts` handles all resource types
   - Test with sample agent/command/skill/style markdown files
   - No external YAML library needed

3. **Caching Strategy Validation**:
   - Confirm mtime-based cache invalidation pattern from `spec-awareness.ts` (lines 22-28, 345-356)
   - Validate LRU eviction logic design (Map with access-time tracking)
   - Set MAX_CACHE_SIZE=50 (same constant pattern as MAX_MEMORIES=5 in memory-plugin.ts)

4. **Keyword Matching Confirmation**:
   - Verify `matchItemsByKeywords()` from `keyword-matcher.ts` (lines 56-85) fits use case
   - Test with sample agent definitions
   - Confirm `extractKeywords()` from `agent-suggester.ts` (lines 29-48) works for fallback

5. **Integration Pattern Review**:
   - Review `context-builder.ts` Promise.allSettled pattern (lines 186, 246-309)
   - Confirm DynamicDiscoveryOptions interface follows SpecAwarenessOptions pattern (lines 111-117)
   - Validate result interface structure (success, context, error, skipped, skipReason)

6. **Path Validation Security**:
   - Review `isValidFeaturePath()` pattern from `spec-awareness.ts` (lines 35-57)
   - Adapt for dynamic discovery (reject "..", null bytes, allow safe characters)
   - Document regex pattern: `/^[a-zA-Z0-9/:._-]+$/`

**Research Questions to Answer**:
- Q1: Does Bun's fs implementation support `withFileTypes: true`?
- Q2: Can we implement 2-second timeout with Promise.race without blocking other integrations?
- Q3: Should cache be per-directory or per-file? (Decision: per-file for granular invalidation)
- Q4: How to handle symlinks in agent directories? (Decision: follow by default, validate resolved paths)

**Acceptance Criteria**:
- All technology choices validated with proof-of-concept code snippets
- No new npm dependencies required
- Security patterns documented for path validation
- Integration approach confirmed to follow existing patterns

---

## Phase 1: Filesystem Scanning Infrastructure

**Purpose**: Build core scanning, caching, and validation utilities that all discovery sources depend on

**User Stories**: Maps to US4 (Integration Pattern Compliance), US5 (Performance)

**Deliverables**:
- `scanDirectory()` function with timeout enforcement
- `DiscoveryCache` class with LRU eviction and mtime validation
- `validateResourcePath()` security function
- `expandHomePath()` cross-platform utility
- Integration tests with `_mockFileSystem` option
- data-model.md with TypeScript interfaces

**Details**:

This phase creates the foundation for all resource discovery. No user-facing features yet, but infrastructure must be robust and testable.

**Key Components**:

1. **Directory Scanner** (`scanDirectory()`):
   - Input: directory path, timeout (default 2000ms)
   - Output: array of file paths (absolute) matching `.md` extension
   - Uses `fs.readdir()` with `{ withFileTypes: true }`
   - Implements timeout with Promise.race
   - Returns partial results on timeout, logs warning
   - Handles ENOENT (missing dir), EACCES (permission), ENOTDIR gracefully

2. **Discovery Cache** (LRU with mtime):
   - Map<string, CacheEntry> where key = absolute file path
   - CacheEntry: { content: parsed metadata, mtimeMs: number, lastAccessed: number }
   - MAX_CACHE_SIZE = 50 constant
   - Eviction: when size > MAX, remove entry with oldest lastAccessed
   - Invalidation: compare current file mtime with cached mtimeMs

3. **Path Validation** (`validateResourcePath()`):
   - Reject ".." sequences (path traversal)
   - Reject null bytes (\0)
   - Allow alphanumeric, hyphens, underscores, slashes, dots, colons (Windows)
   - Regex: `/^[a-zA-Z0-9/:._-]+$/`

4. **Home Path Expansion** (`expandHomePath()`):
   - Replace `~` with `os.homedir()` for cross-platform support
   - Handle `~/` prefix correctly on Linux/macOS/Windows

**TDD Approach**:
- Write tests first for each utility function
- Use `_mockFileSystem` option for all filesystem tests
- Test error cases: missing dirs, permission errors, timeouts, invalid paths
- Test cross-platform path handling (Windows backslashes, Linux forward slashes)

**Integration with Existing Code**:
- Reuse `readFileSyncSafe()` from `utils/file-reader.ts` for reading file content
- Follow cache pattern from `spec-awareness.ts` (lines 345-363)
- Follow security pattern from `isValidFeaturePath()` (lines 35-57)

**Acceptance Criteria**:
- All infrastructure functions have 100% test coverage
- Tests use `_mockFileSystem` exclusively (no real filesystem access)
- Timeout enforcement works (test with Promise that never resolves)
- Cache eviction works (test with MAX_CACHE_SIZE + 1 entries)
- Path validation rejects all attack vectors (test with "../etc/passwd", "file\0.md")

---

## Phase 2: Agent Discovery

**Purpose**: Implement agent discovery, parsing, and matching - the foundation of dynamic discovery

**User Stories**: Maps to US1 (Agent Discovery), US4 (Integration Pattern Compliance)

**Deliverables**:
- `discoverAgents()` function
- `parseAgentMetadata()` function (reuses `parseFrontmatter()`)
- `matchAgentsToPrompt()` function (uses `matchItemsByKeywords()`)
- `formatAgentSuggestions()` formatter
- Integration tests for agent discovery scenarios
- `gatherDynamicContext()` skeleton (agents only)

**Details**:

This phase implements the first complete discovery flow: scan → parse → match → format.

**Key Components**:

1. **Agent Discovery** (`discoverAgents()`):
   - Scans both `~/.claude/agents/` and `.claude/agents/`
   - Returns array of `DiscoveredAgent` objects
   - Handles local precedence: `.claude/agents/foo.md` overrides `~/.claude/agents/foo.md`
   - Deduplication by normalised name (case-insensitive, no extension)

2. **Agent Metadata Parsing** (`parseAgentMetadata()`):
   - Reuses `parseFrontmatter()` from `spec-awareness.ts`
   - Extracts: name, description, keywords (explicit or derived)
   - Fallback hierarchy: explicit keywords → extractKeywords(description) → filename
   - Handles malformed YAML gracefully (skip file, log warning)

3. **Agent Matching** (`matchAgentsToPrompt()`):
   - Uses `matchItemsByKeywords()` from `keyword-matcher.ts`
   - Returns sorted by score (highest relevance first)
   - Limits to top 5 matches (MAX_SUGGESTIONS constant)

4. **Agent Formatting** (`formatAgentSuggestions()`):
   - Format: "- Agent: {name} - {description}"
   - Include usage example: "Use with @agent {name}"
   - If >5 matches, note "and N more available"

5. **Integration Skeleton** (`gatherDynamicContext()`):
   - Exports DynamicDiscoveryOptions interface with `_mockFileSystem`
   - Implements disabled check (options.enabled === false)
   - Returns DynamicDiscoveryResult with success/error/skipped/skipReason
   - Agents only for now (Phase 3 adds other sources)

**TDD Approach**:
- Test agent discovery with global-only, local-only, both scenarios
- Test local precedence (same filename in both dirs)
- Test malformed frontmatter (invalid YAML, missing description)
- Test keyword matching (explicit keywords, derived keywords, filename fallback)
- Test suggestion limiting (>5 matches returns top 5)
- All tests use `_mockFileSystem`

**Integration with Existing Code**:
- Reuse `parseFrontmatter()` from `spec-awareness.ts` (lines 149-198)
- Reuse `matchItemsByKeywords()` from `keyword-matcher.ts` (lines 56-85)
- Reuse `extractKeywords()` from `agent-suggester.ts` (lines 29-48)
- Follow result interface pattern from `SpecAwarenessResult` (lines 122-128)

**Acceptance Criteria**:
- Agent discovery works with global/local directories
- Local agents override global agents correctly
- Malformed frontmatter skipped without crashing
- Keyword matching returns top 5 most relevant agents
- All tests pass with `_mockFileSystem`
- Integration exports match established pattern (gatherX, formatX, XOptions, XResult)

---

## Phase 3: Multi-Source Discovery

**Purpose**: Extend discovery pattern to commands, skills, and output styles

**User Stories**: Maps to US2 (Multi-Source Discovery), US4 (Integration Pattern Compliance)

**Deliverables**:
- `discoverCommands()` function
- `discoverSkills()` function
- `discoverOutputStyles()` function
- `formatDynamicContext()` function (combines all sources)
- Integration tests for each resource type
- Updated `gatherDynamicContext()` with all sources

**Details**:

This phase scales the agent discovery pattern horizontally to all resource types.

**Key Components**:

1. **Command Discovery** (`discoverCommands()`):
   - Scans `~/.claude/commands/` and `.claude/commands/`
   - Same pattern as agents: parse frontmatter, extract keywords, deduplicate
   - Format: "- Command: /{name} - {description}"

2. **Skill Discovery** (`discoverSkills()`):
   - Scans `~/.claude/skills/` and `.claude/skills/`
   - Skills are directory-based: look for skill definition files inside each subdirectory
   - Fallback: use directory name if no definition file found
   - Format: "- Skill: {name} - {description}"

3. **Output Style Discovery** (`discoverOutputStyles()`):
   - Scans `~/.claude/output-styles/` and `.claude/output-styles/`
   - Same pattern as agents and commands
   - Format: "- Style: {name} - {description}"

4. **Combined Formatting** (`formatDynamicContext()`):
   - Takes DynamicContext with all matched resources
   - Sections: "Suggested Agents:", "Suggested Commands:", "Suggested Skills:", "Suggested Output Styles:"
   - Only include sections with >0 matches
   - Top 5 per section

5. **Parallel Discovery** (`gatherDynamicContext()` update):
   - Discover all sources in parallel (Promise.all for internal parallelism)
   - Timeout per source (2 seconds each, not 2 seconds total)
   - Aggregate results into single DynamicContext
   - Even if one source fails, return partial results

**TDD Approach**:
- Test each resource type independently
- Test skills directory-based discovery (different from file-based)
- Test parallel discovery with partial failures (one source times out)
- Test combined formatting with various combinations (agents only, agents+commands, all sources)
- All tests use `_mockFileSystem`

**Integration with Existing Code**:
- Follow same pattern as agent discovery (reuse utilities)
- Skills discovery may need special handling (directory vs file) - document in research.md if needed

**Acceptance Criteria**:
- Commands, skills, output styles discovered correctly
- Skills handle directory-based structure
- Parallel discovery works with timeout per source
- Partial failures don't block other sources
- Combined formatting includes all matched resources (top 5 per type)
- All tests pass with `_mockFileSystem`

---

## Phase 4: Memory Think Special Case

**Purpose**: Detect memory think patterns and provide specialised suggestions with --agent and --style flag usage

**User Stories**: Maps to US3 (Memory Think Special Case)

**Deliverables**:
- `detectMemoryThinkPattern()` function
- `formatMemoryThinkSuggestions()` function
- Integration tests for memory think detection and formatting
- Updated `formatDynamicContext()` with memory think awareness

**Details**:

This phase adds intelligent context-aware suggestions for memory think workflows.

**Key Components**:

1. **Memory Think Detection** (`detectMemoryThinkPattern()`):
   - Regex patterns for variations:
     - `memory think create`
     - `memory think add`
     - `memory think counter`
     - `memory think branch`
     - `memory think conclude`
   - Regex: `/memory\s+think\s+(create|add|counter|branch|conclude)/i`
   - Returns boolean + matched command variant

2. **Memory Think Formatting** (`formatMemoryThinkSuggestions()`):
   - Header: "💡 Memory Think Suggestions:"
   - Explanatory text: "Consider using --agent <name> for domain expertise or --style <name> for perspective"
   - Top 3-5 matched agents with usage examples:
     - "memory think add 'consideration' --agent security-expert"
   - Top 3-5 matched styles with usage examples:
     - "memory think counter 'argument' --style devil's-advocate"
   - If no matches: generic guidance without empty lists

3. **Context Awareness** (`formatDynamicContext()` update):
   - Check `isMemoryThinkContext` flag
   - If true, use `formatMemoryThinkSuggestions()` instead of regular formatting
   - Different layout emphasises --agent and --style flags

**TDD Approach**:
- Test pattern detection for all command variants
- Test case insensitivity (MEMORY THINK, Memory Think, memory think)
- Test formatting with 0 matches, 1-3 matches, >5 matches
- Test combined agent + style suggestions
- All tests use mock data

**Integration with Existing Code**:
- No new patterns needed - pure logic addition
- Uses existing matched agents/styles from Phase 2/3

**Acceptance Criteria**:
- Memory think patterns detected correctly (all variants)
- Formatting distinct from regular suggestions
- --agent and --style usage examples clear
- Graceful handling when no matches found
- All tests pass

---

## Phase 5: Integration & Configuration

**Purpose**: Wire dynamic discovery into context-builder.ts and add configuration toggle

**User Stories**: Maps to US4 (Integration Pattern Compliance)

**Deliverables**:
- Updated `context-builder.ts` with dynamic discovery integration
- Configuration toggle: `integrations.dynamicDiscovery: boolean`
- Integration tests for context-builder.ts flow
- Updated `FormattedContext` interface with `dynamic` field
- quickstart.md for developers

**Details**:

This phase completes the feature by integrating into the existing context system.

**Key Components**:

1. **Context Builder Integration**:
   - Add `DynamicDiscoveryOptions` to `ContextBuilderInput` interface
   - Add async task in `buildAsyncTasks()` function (line 230-309 pattern)
   - Use Promise.allSettled to avoid blocking other integrations
   - Add `dynamic?: DynamicContext` to `BuiltContext` interface
   - Add `dynamic?: string` to `FormattedContext` interface

2. **Configuration Toggle**:
   - Add `dynamicDiscovery?: boolean` to integration options
   - Default: true (enabled by default)
   - When disabled: `gatherDynamicContext()` returns `{ success: false, skipped: true, skipReason: 'disabled' }`

3. **Context Formatting Integration**:
   - Add `formatDynamicContext()` call in `formatContextForInjection()` (line 314-338 pattern)
   - Use `formatField()` helper (lines 74-85)
   - Only include `dynamic` field if context present and source in sources array

4. **End-to-End Testing**:
   - Test full flow: prompt → buildContext → formatContextForInjection → dynamic suggestions
   - Test with dynamicDiscovery enabled/disabled
   - Test interaction with other integrations (git, lsp, spec, memory)
   - Test Promise.allSettled behaviour (dynamic discovery timeout doesn't block others)

**TDD Approach**:
- Write integration tests for context-builder.ts first
- Test configuration toggle (enabled/disabled)
- Test Promise.allSettled behaviour (simulate timeout)
- Test formatted output includes dynamic suggestions
- Use `_mockFileSystem` for all filesystem operations

**Integration with Existing Code**:
- Follow exact pattern from `spec-awareness.ts` integration (lines 272-281)
- Reuse `createAsyncTask()` helper (lines 60-69)
- Reuse `formatField()` helper (lines 74-85)
- Add to `ContextSource` type (line 88-96): add `'dynamic'`

**Acceptance Criteria**:
- Dynamic discovery integrated into context-builder.ts
- Configuration toggle works (enabled/disabled)
- Doesn't block other integrations on timeout/failure
- Formatted context includes dynamic suggestions
- All integration tests pass
- `npx tsc --noEmit` passes (no TypeScript errors)
- quickstart.md provides clear developer setup guide

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Filesystem performance on large directories** | High - could cause prompt latency >2s | Medium - some users may have hundreds of agents | Implement strict 2-second timeout per directory, cache aggressively, limit to top-level files only (no recursion) |
| **Path traversal vulnerabilities** | High - security risk if paths not validated | Low - we control the code | Strict path validation with regex, reject ".." and null bytes, extensive security tests |
| **Bun runtime API differences** | Medium - code may not work in Bun if fs APIs differ | Low - Bun aims for Node.js compatibility | Phase 0 validation with proof-of-concept, fallback to Node.js fs if needed |
| **Cache invalidation bugs** | Medium - stale data if mtime checks fail | Low - pattern proven in spec-awareness.ts | Reuse exact mtime pattern from existing code, test cache invalidation explicitly |
| **Windows path handling** | Medium - feature may break on Windows | Medium - cross-platform testing hard without Windows environment | Use `path.join()` and `os.homedir()` exclusively, document Windows testing needed |
| **Skills directory structure unknown** | Medium - may not know how to parse skill definitions | Medium - skill structure not documented in spec | Phase 0 research to investigate skill directory structure, fallback to directory names if no definition file |
| **Memory think pattern too narrow** | Low - may miss valid memory think commands | Medium - regex may not match all variations | Make regex flexible with case insensitivity, document supported patterns in code comments |
| **Integration blocking other sources** | Low - dynamic discovery timeout blocks git/lsp/etc | Low - Promise.allSettled prevents this | Use Promise.allSettled pattern from context-builder.ts, test timeout behaviour |

---

**Feature**: 002-dynamic-context-injection | **Status**: Ready for Implementation | **Created**: 2026-01-21

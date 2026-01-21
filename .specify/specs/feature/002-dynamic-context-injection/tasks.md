---
# YAML Frontmatter for spec-lint
description: "Task list for Dynamic Context Injection v1.3.0 implementation"
phases:
  - id: 0
    name: "Research & Technical Decisions"
    maps_to: []
  - id: 1
    name: "Filesystem Scanning Infrastructure"
    maps_to: ["US4", "US5"]
  - id: 2
    name: "Agent Discovery"
    maps_to: ["US1", "US4"]
  - id: 3
    name: "Multi-Source Discovery"
    maps_to: ["US2", "US4"]
  - id: 4
    name: "Memory Think Special Case"
    maps_to: ["US3"]
  - id: 5
    name: "Integration & Configuration"
    maps_to: ["US4"]
---

# Tasks: Dynamic Context Injection v1.3.0

**Feature**: 002 - Dynamic Context Injection v1.3.0
**Input**: Design documents from `/home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/002-dynamic-context-injection/`
**Prerequisites**: plan.md, spec.md, data-model.md, quickstart.md

**TDD Workflow**: All implementation tasks follow Red-Green-Refactor cycle (see `.specify/tdd-checklist.md`)

**Organisation**: Tasks grouped by phase and user story for independent implementation and testing.

---

## TDD Workflow Integration

**Checklist Reference**: `.specify/tdd-checklist.md`

Each implementation task follows the **Red-Green-Refactor** cycle:

| Phase | Action | Verification |
|-------|--------|--------------|
| 🔴 **Red** | Write failing test | Test compiles, runs, and **fails** for expected reason |
| 🟢 **Green** | Write minimum code to pass | Test now **passes** |
| 🔵 **Refactor** | Clean up without changing behaviour | All tests still **pass** |

**TDD Status Reporting**: Include in task completion:
```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

---

## Phase 0: Research & Technical Decisions

**Purpose**: Validate technology choices and confirm integration patterns

**Rationale for Phase 0**: Research phase is numbered 0 (not 1) because it produces no shippable code—it validates assumptions and documents decisions that inform all subsequent implementation phases.

- [ ] T001 Validate `fs.readdir()` with `{ withFileTypes: true }` works in Bun runtime in /home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/002-dynamic-context-injection/research.md
- [ ] T002 Test cross-platform path handling with `path.join()`, `path.resolve()`, `os.homedir()` in research.md
- [ ] T003 Document timeout implementation strategy using Promise.race with setTimeout in research.md
- [ ] T004 Verify `parseFrontmatter()` from spec-awareness.ts handles all resource types (agents, commands, skills, styles) in research.md
- [ ] T005 Confirm `matchItemsByKeywords()` from keyword-matcher.ts fits discovery use case in research.md
- [ ] T006 Review Promise.allSettled pattern from context-builder.ts for integration in research.md
- [ ] T007 Document path validation security pattern adapted from isValidFeaturePath() in research.md
- [ ] T008 Investigate skill directory structure and document discovery strategy in research.md

---

## Phase 1: Filesystem Scanning Infrastructure

**Purpose**: Build core scanning, caching, and validation utilities for all discovery sources

**User Stories**: US4 (Integration Pattern Compliance), US5 (Performance)

### Tests for Infrastructure

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T009 [P] [US5] Test directory scanner with `fs.readdir()` and `{ withFileTypes: true }` in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T010 [P] [US5] Test directory scanner filters files by .md extension in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T011 [P] [US5] Test directory scanner returns absolute file paths in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T012 [P] [US5] Test directory scanner enforces 2-second timeout with Promise.race in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T013 [P] [US5] Test directory scanner returns partial results on timeout in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T014 [P] [US5] Test directory scanner handles ENOENT gracefully (missing directory) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T015 [P] [US5] Test directory scanner handles EACCES gracefully (permission denied) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T016 [P] [US5] Test directory scanner handles ENOTDIR gracefully (path is file, not directory) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.spec.ts
- [ ] T017 [P] [US5] Test cache creation with MAX_CACHE_SIZE=50 in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T018 [P] [US5] Test cache get() returns cached item when mtime matches in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T019 [P] [US5] Test cache get() returns null when mtime differs (invalidation) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T020 [P] [US5] Test cache get() updates lastAccessed timestamp on hit in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T021 [P] [US5] Test cache set() stores item with mtime and lastAccessed in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T022 [P] [US5] Test cache evicts LRU entry when size exceeds MAX_CACHE_SIZE in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T023 [P] [US5] Test cache invalidate() removes specific entry in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T024 [P] [US5] Test cache clear() removes all entries in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.spec.ts
- [ ] T025 [P] [US4] Test path validation rejects ".." sequences in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-validator.spec.ts
- [ ] T026 [P] [US4] Test path validation rejects null bytes (\0) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-validator.spec.ts
- [ ] T027 [P] [US4] Test path validation allows alphanumeric, hyphens, underscores, slashes, dots, colons in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-validator.spec.ts
- [ ] T028 [P] [US4] Test path validation uses regex `/^[a-zA-Z0-9/:._-]+$/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-validator.spec.ts
- [ ] T029 [P] [US4] Test home path expansion replaces `~` with `os.homedir()` in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-expander.spec.ts
- [ ] T030 [P] [US4] Test home path expansion handles `~/` prefix correctly in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-expander.spec.ts
- [ ] T031 [P] [US4] Test home path expansion works cross-platform (Linux, macOS, Windows) in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-expander.spec.ts

### Implementation for Infrastructure

- [ ] T032 [P] [US5] Implement directory scanner with `fs.readdir()` and timeout in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/directory-scanner.ts
- [ ] T033 [P] [US5] Implement DiscoveryCache class with LRU eviction and mtime validation in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/discovery-cache.ts
- [ ] T034 [P] [US4] Implement path validation with security regex in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-validator.ts
- [ ] T035 [P] [US4] Implement home path expansion utility in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/path-expander.ts
- [ ] T036 [US4] [US5] Define TypeScript interfaces in data-model.md (DiscoveredItem, CacheEntry, ResourceDirectory, etc.) in /home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/002-dynamic-context-injection/data-model.md

**Checkpoint**: Filesystem scanning infrastructure ready - all utilities tested with `_mockFileSystem`

---

## Phase 2: Agent Discovery

**Purpose**: Implement agent discovery, parsing, and matching - foundation of dynamic discovery

**User Stories**: US1 (Agent Discovery), US4 (Integration Pattern Compliance)

### Tests for Agent Discovery

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T037 [P] [US1] Test agent metadata parsing extracts name from frontmatter in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T038 [P] [US1] Test agent metadata parsing extracts description from frontmatter in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T039 [P] [US1] Test agent metadata parsing extracts explicit keywords from frontmatter in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T040 [P] [US1] Test agent metadata parsing falls back to extracting keywords from description in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T041 [P] [US1] Test agent metadata parsing falls back to filename when frontmatter missing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T042 [P] [US1] Test agent metadata parsing handles malformed YAML gracefully (skip, log warning) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T043 [P] [US1] Test agent discovery scans global directory `~/.claude/agents/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T044 [P] [US1] Test agent discovery scans local directory `.claude/agents/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T045 [P] [US1] Test agent discovery scans both global and local directories in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T046 [P] [US1] Test agent discovery local precedence (`.claude/agents/foo.md` overrides `~/.claude/agents/foo.md`) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T047 [P] [US1] Test agent discovery deduplication by normalised name (case-insensitive, no extension) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T048 [P] [US1] Test agent discovery handles missing global directory gracefully in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T049 [P] [US1] Test agent discovery handles missing local directory gracefully in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T050 [P] [US1] Test agent matching uses `matchItemsByKeywords()` from keyword-matcher.ts in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T051 [P] [US1] Test agent matching returns sorted by score (highest relevance first) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T052 [P] [US1] Test agent matching limits to top 5 matches (MAX_SUGGESTIONS=5) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T053 [P] [US1] Test agent formatting uses "- Agent: {name} - {description}" format in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T054 [P] [US1] Test agent formatting includes usage example "Use with @agent {name}" in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T055 [P] [US1] Test agent formatting notes "and N more available" when >5 matches in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T056 [P] [US4] Test gatherDynamicContext() exports DynamicDiscoveryOptions interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T057 [P] [US4] Test gatherDynamicContext() supports `_mockFileSystem` option in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T058 [P] [US4] Test gatherDynamicContext() returns DynamicDiscoveryResult with success/error/skipped in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T059 [P] [US4] Test gatherDynamicContext() returns skipped=true when enabled=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T060 [P] [US4] Test gatherDynamicContext() returns skipReason='disabled' when enabled=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts

### Implementation for Agent Discovery

- [ ] T061 [P] [US1] Implement parseAgentMetadata() reusing parseFrontmatter() from spec-awareness.ts in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T062 [P] [US1] Implement discoverAgents() with global/local directory scanning in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T063 [P] [US1] Implement matchAgentsToPrompt() using matchItemsByKeywords() from keyword-matcher.ts in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T064 [P] [US1] Implement formatAgentSuggestions() with formatting logic in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T065 [US4] Implement gatherDynamicContext() skeleton (agents only, Phase 3 adds other sources) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T066 [US4] Implement formatDynamicContext() skeleton (agents only, Phase 3 adds other sources) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts

**Checkpoint**: Agent discovery works with global/local directories, local precedence, keyword matching

---

## Phase 3: Multi-Source Discovery

**Purpose**: Extend discovery pattern to commands, skills, and output styles

**User Stories**: US2 (Multi-Source Discovery), US4 (Integration Pattern Compliance)

### Tests for Multi-Source Discovery

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T067 [P] [US2] Test command discovery scans `~/.claude/commands/` and `.claude/commands/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T068 [P] [US2] Test command discovery parses frontmatter with name and description in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T069 [P] [US2] Test command discovery extracts keywords (explicit > description > filename) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T070 [P] [US2] Test command discovery local precedence and deduplication in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T071 [P] [US2] Test command formatting uses "- Command: /{name} - {description}" format in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T072 [P] [US2] Test skill discovery scans `~/.claude/skills/` and `.claude/skills/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T073 [P] [US2] Test skill discovery handles directory-based structure (skill definition inside subdirectory) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T074 [P] [US2] Test skill discovery falls back to directory name when no definition file in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T075 [P] [US2] Test skill discovery local precedence and deduplication in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T076 [P] [US2] Test skill formatting uses "- Skill: {name} - {description}" format in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T077 [P] [US2] Test output style discovery scans `~/.claude/output-styles/` and `.claude/output-styles/` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T078 [P] [US2] Test output style discovery parses frontmatter with name and description in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T079 [P] [US2] Test output style discovery local precedence and deduplication in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T080 [P] [US2] Test output style formatting uses "- Style: {name} - {description}" format in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T081 [P] [US2] Test parallel discovery uses Promise.all for internal parallelism in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T082 [P] [US2] Test parallel discovery timeout per source (2 seconds each, not 2 seconds total) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T083 [P] [US2] Test parallel discovery partial failure (one source times out, others succeed) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T084 [P] [US2] Test combined formatting includes "Suggested Agents:" section when matches exist in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T085 [P] [US2] Test combined formatting includes "Suggested Commands:" section when matches exist in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T086 [P] [US2] Test combined formatting includes "Suggested Skills:" section when matches exist in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T087 [P] [US2] Test combined formatting includes "Suggested Output Styles:" section when matches exist in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T088 [P] [US2] Test combined formatting omits sections with 0 matches in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T089 [P] [US2] Test combined formatting limits to top 5 per section in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts

### Implementation for Multi-Source Discovery

- [ ] T090 [P] [US2] Implement discoverCommands() following agent discovery pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T091 [P] [US2] Implement discoverSkills() with directory-based structure handling in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T092 [P] [US2] Implement discoverOutputStyles() following agent discovery pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T093 [US2] Update gatherDynamicContext() to discover all sources in parallel in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T094 [US2] Update formatDynamicContext() to combine all matched resources in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts

**Checkpoint**: Commands, skills, output styles discovered correctly, parallel discovery with partial failures

---

## Phase 4: Memory Think Special Case

**Purpose**: Detect memory think patterns and provide specialised suggestions

**User Stories**: US3 (Memory Think Special Case)

### Tests for Memory Think

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T095 [P] [US3] Test memory think detection matches "memory think create" pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T096 [P] [US3] Test memory think detection matches "memory think add" pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T097 [P] [US3] Test memory think detection matches "memory think counter" pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T098 [P] [US3] Test memory think detection matches "memory think branch" pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T099 [P] [US3] Test memory think detection matches "memory think conclude" pattern in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T100 [P] [US3] Test memory think detection is case insensitive (MEMORY THINK, Memory Think) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T101 [P] [US3] Test memory think detection uses regex `/memory\s+think\s+(create|add|counter|branch|conclude)/i` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T102 [P] [US3] Test memory think formatting includes header "💡 Memory Think Suggestions:" in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T103 [P] [US3] Test memory think formatting includes guidance text "Consider using --agent <name> for domain expertise or --style <name> for perspective" in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T104 [P] [US3] Test memory think formatting suggests top 3-5 matched agents in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T105 [P] [US3] Test memory think formatting suggests top 3-5 matched styles in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T106 [P] [US3] Test memory think formatting includes usage examples with --agent flag in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T107 [P] [US3] Test memory think formatting includes usage examples with --style flag in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T108 [P] [US3] Test memory think formatting handles 0 matches gracefully (generic guidance, no empty lists) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T109 [P] [US3] Test memory think formatting handles 1-3 matches without truncation in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T110 [P] [US3] Test memory think formatting handles >5 matches with truncation to top 5 in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T111 [P] [US3] Test formatDynamicContext() checks isMemoryThinkContext flag in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T112 [P] [US3] Test formatDynamicContext() uses formatMemoryThinkSuggestions() when isMemoryThinkContext=true in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T113 [P] [US3] Test formatDynamicContext() uses regular formatting when isMemoryThinkContext=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts

### Implementation for Memory Think

- [ ] T114 [P] [US3] Implement detectMemoryThinkPattern() with regex matching in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T115 [P] [US3] Implement formatMemoryThinkSuggestions() with specialised formatting in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts
- [ ] T116 [US3] Update formatDynamicContext() with memory think awareness in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.ts

**Checkpoint**: Memory think patterns detected, specialised suggestions with --agent and --style examples

---

## Phase 5: Integration & Configuration

**Purpose**: Wire dynamic discovery into context-builder.ts and add configuration toggle

**User Stories**: US4 (Integration Pattern Compliance)

### Tests for Integration

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T117 [P] [US4] Test context-builder.ts imports gatherDynamicContext from dynamic-discovery.ts in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T118 [P] [US4] Test context-builder.ts adds DynamicDiscoveryOptions to ContextBuilderInput interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T119 [P] [US4] Test context-builder.ts adds async task in buildAsyncTasks() for dynamic discovery in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T120 [P] [US4] Test context-builder.ts uses Promise.allSettled for dynamic discovery in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T121 [P] [US4] Test context-builder.ts adds `dynamic?: DynamicContext` to BuiltContext interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T122 [P] [US4] Test context-builder.ts adds `dynamic?: string` to FormattedContext interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T123 [P] [US4] Test context-builder.ts adds 'dynamic' to ContextSource type in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T124 [P] [US4] Test context-builder.ts calls formatDynamicContext() in formatContextForInjection() in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T125 [P] [US4] Test context-builder.ts uses formatField() helper for dynamic context in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T126 [P] [US4] Test context-builder.ts includes dynamic field only when source in sources array in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T127 [P] [US4] Test configuration toggle `integrations.dynamicDiscovery: boolean` defaults to true in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [ ] T128 [P] [US4] Test configuration toggle `integrations.dynamicDiscovery: false` disables discovery in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [ ] T129 [P] [US4] Test gatherDynamicContext() returns skipped=true when enabled=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/dynamic-discovery.spec.ts
- [ ] T130 [P] [US4] Test end-to-end flow: prompt → buildContext → formatContextForInjection → dynamic suggestions in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T131 [P] [US4] Test dynamic discovery enabled doesn't block other integrations (git, lsp, spec, memory) in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T132 [P] [US4] Test dynamic discovery timeout doesn't block other integrations in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T133 [P] [US4] Test dynamic discovery failure doesn't block other integrations in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T134 [P] [US4] Test formatted context includes dynamic suggestions when discovery succeeds in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T135 [P] [US4] Test formatted context omits dynamic field when discovery disabled in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [ ] T136 [P] [US4] Test formatted context omits dynamic field when discovery returns no matches in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts

### Implementation for Integration

- [ ] T137 [US4] Add DynamicDiscoveryOptions to ContextBuilderInput interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T138 [US4] Add async task for dynamic discovery in buildAsyncTasks() in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T139 [US4] Add `dynamic?: DynamicContext` to BuiltContext interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T140 [US4] Add `dynamic?: string` to FormattedContext interface in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T141 [US4] Add 'dynamic' to ContextSource type in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T142 [US4] Call formatDynamicContext() in formatContextForInjection() in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
- [ ] T143 [US4] Add `dynamicDiscovery?: boolean` to integration options in configuration in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.ts
- [ ] T144 [US4] Create quickstart.md developer setup guide in /home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/002-dynamic-context-injection/quickstart.md
- [ ] T145 [US4] Run `npx tsc --noEmit` to verify no TypeScript compilation errors in /home/gareth/.vs/claude-prompt-improver/hooks/

**Checkpoint**: Dynamic discovery integrated into context-builder.ts, configuration toggle works, all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Research)**: No dependencies - can start immediately
- **Phase 1 (Infrastructure)**: Depends on Phase 0 completion
- **Phase 2 (Agent Discovery)**: Depends on Phase 1 completion
- **Phase 3 (Multi-Source)**: Depends on Phase 2 completion (extends agent pattern)
- **Phase 4 (Memory Think)**: Depends on Phase 2 completion (uses discovered agents/styles)
- **Phase 5 (Integration)**: Depends on Phases 2, 3, 4 completion (integrates all features)

### User Story Dependencies

- **US1 (Agent Discovery)**: Depends on US4, US5 (Infrastructure) - Phase 1 must complete first
- **US2 (Multi-Source Discovery)**: Depends on US1 (Agent Discovery) - Phase 2 must complete first
- **US3 (Memory Think)**: Depends on US1, US2 (Discovery complete) - Phases 2, 3 must complete first
- **US4 (Integration Pattern Compliance)**: Spans all phases - tested throughout
- **US5 (Performance)**: Depends on US4 (Infrastructure) - Phase 1 must complete first

### Within Each Phase

1. **ALL Tests first** - Write and run ALL tests in the Tests subsection
2. **Verify ALL fail** - Confirm each test fails for the expected reason
3. **ALL Implementation** - Then proceed to Implementation subsection
4. **Verify tests pass** - Each implementation should make corresponding test(s) pass
5. **Refactor** - Clean up while maintaining passing tests

### Parallel Opportunities

- Phase 0 research tasks (T001-T008) can run in parallel
- Phase 1 infrastructure tests (T009-T031) can run in parallel
- Phase 1 infrastructure implementation (T032-T035) can run in parallel
- Phase 2 agent discovery tests (T037-T060) can run in parallel
- Phase 2 agent discovery implementation (T061-T064) can run in parallel
- Phase 3 multi-source tests (T067-T089) can run in parallel
- Phase 3 multi-source implementation (T090-T092) can run in parallel
- Phase 4 memory think tests (T095-T113) can run in parallel
- Phase 4 memory think implementation (T114-T115) can run in parallel
- Phase 5 integration tests (T117-T136) can run in parallel
- Phase 5 integration implementation (T137-T143) can run in parallel (except T145 which depends on all)

---

## Implementation Strategy

### MVP First (US1, US4, US5 Only)

1. Complete Phase 0: Research
2. Complete Phase 1: Infrastructure (US4, US5)
3. Complete Phase 2: Agent Discovery (US1, US4)
4. Complete Phase 5: Integration (US4) - with agents only
5. **STOP and VALIDATE**: Test agent discovery independently
6. Optionally add multi-source discovery (Phase 3) and memory think (Phase 4)

### Incremental Delivery

1. Infrastructure ready (Phase 1) → Scanning, caching, validation utilities available
2. Add Agent Discovery (Phase 2) → Agents discovered and suggested
3. Add Multi-Source Discovery (Phase 3) → Commands, skills, styles discovered
4. Add Memory Think (Phase 4) → Special case suggestions for memory think
5. Full Integration (Phase 5) → All discovery integrated into context-builder.ts

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 and Phase 1 together
2. Once Phase 1 done:
   - Developer A: Phase 2 (Agent Discovery)
   - Developer B: Start Phase 3 tests (Multi-Source Discovery tests)
3. Once Phase 2 done:
   - Developer A: Phase 4 (Memory Think)
   - Developer B: Phase 3 implementation (Multi-Source Discovery)
4. Once Phases 2, 3, 4 done:
   - Team: Phase 5 (Integration) together

---

## Validation Checklist

Before finalising tasks.md, verify:

- [x] All template sample tasks removed
- [x] Each phase has "### Tests for [Phase Name]" subsection
- [x] Each phase has "### Implementation for [Phase Name]" subsection
- [x] Tests subsection comes BEFORE Implementation subsection in EVERY phase
- [x] NO interleaved test/implementation tasks
- [x] All tasks use absolute file paths
- [x] Parallelisable tasks marked with [P]
- [x] Story-specific tasks tagged with [USX]
- [x] Checkpoints included for each phase
- [x] YAML frontmatter updated with phase mappings

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each phase should be independently completable and testable
- Verify ALL tests fail before ANY implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate functionality independently
- TDD status reporting required: `TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌`
- **CRITICAL**: Run `npx tsc --noEmit` before committing to catch TypeScript compilation errors
- **CRITICAL**: Check memory for gotchas at phase start to prevent repeating mistakes

---

**Tasks Version**: 1.0.0 | **Status**: Ready | **Created**: 2026-01-21

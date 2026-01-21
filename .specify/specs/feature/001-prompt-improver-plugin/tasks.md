---
# YAML Frontmatter for spec-lint
description: "Task list for Claude Prompt Improver Plugin implementation"
phases:
  - id: 0
    name: "Research & Technical Decisions"
    maps_to: []
  - id: 1
    name: "Foundation & Core Architecture"
    maps_to: ["US10", "US11"]
  - id: 2
    name: "Classification & Improvement Engine"
    maps_to: ["US1", "US9"]
  - id: 3
    name: "Bypass Logic & Smart Detection"
    maps_to: ["US2"]
  - id: 4
    name: "Context Detection & Injection - Tools/Skills/Agents"
    maps_to: ["US3"]
  - id: 5
    name: "Advanced Context Integrations - Git"
    maps_to: ["US4"]
  - id: 6
    name: "Advanced Context Integrations - LSP"
    maps_to: ["US5"]
  - id: 7
    name: "Advanced Context Integrations - Specification Awareness"
    maps_to: ["US6"]
  - id: 8
    name: "Advanced Context Integrations - Memory Plugin"
    maps_to: ["US7"]
  - id: 9
    name: "Advanced Context Integrations - Session Context"
    maps_to: ["US8"]
  - id: 10
    name: "Documentation & Polish"
    maps_to: ["US12"]
---

# Tasks: Claude Prompt Improver Plugin

**Feature**: 001 - Claude Prompt Improver Plugin
**Input**: Design documents from `/home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/001-prompt-improver-plugin/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**TDD Workflow**: All implementation tasks follow Red-Green-Refactor cycle (see `.specify/tdd-checklist.md`)

**Organisation**: Tasks grouped by user story priority (P1 → P2 → P3) for independent implementation and testing.

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

**Purpose**: Validate technical approach and establish implementation patterns

**Rationale for Phase 0**: Research phase is numbered 0 (not 1) because it produces no shippable code—it validates assumptions and documents decisions that inform all subsequent implementation phases. This aligns with zero-indexed thinking where Phase 0 is "pre-implementation".

- [X] T001 Research and document classification prompt design in /home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/001-prompt-improver-plugin/research.md
- [X] T002 Validate session forking with `claude --fork-session` command and document recursion prevention in research.md
- [X] T003 Test token counting heuristic accuracy for ~10 token threshold and document in research.md
- [X] T004 Research XML tag selection criteria and document when to apply vs skip in research.md
- [X] T005 Locate claude-memory-plugin index.json path and document memory matching strategy in research.md
- [X] T006 Research LSP integration via MCP and document diagnostic retrieval in research.md
- [X] T007 Document context parsing from hook stdin structure in research.md

---

## Phase 1: Foundation & Core Architecture

**Purpose**: Build plugin skeleton, error handling, logging, and configuration system

**User Stories**: US10 (Configuration), US11 (Logging)

### Tests for Foundation

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T008 [P] [US11] Test log entry creation with all required fields in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/logger.spec.ts
- [X] T009 [P] [US11] Test JSON log format validation in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/logger.spec.ts
- [X] T010 [P] [US11] Test log file writing to .claude/logs/prompt-improver-latest.log in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/logger.spec.ts
- [X] T011 [P] [US10] Test configuration loading with defaults in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [X] T012 [P] [US10] Test configuration loading from .claude/prompt-improver-config.json in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [X] T013 [P] [US10] Test configuration validation for threshold bounds in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [X] T014 [P] [US10] Test integration toggles default to true in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.spec.ts
- [X] T015 [P] Test error handler graceful fallback to original prompt in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/error-handler.spec.ts
- [X] T016 [P] Test error logging without blocking prompt in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/error-handler.spec.ts
- [X] T017 [P] Test TypeScript types compile in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/types.spec.ts
- [X] T018 Test hook stdin parsing for prompt and context in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.spec.ts
- [X] T019 Test hook stdout output format matches contract in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.spec.ts

### Implementation for Foundation

- [X] T020 Create plugin.json metadata in /home/gareth/.vs/claude-prompt-improver/.claude-plugin/plugin.json
- [X] T021 Create package.json with Bun dependencies in /home/gareth/.vs/claude-prompt-improver/package.json
- [X] T022 [P] Define TypeScript types (Prompt, ImprovedPrompt, Context, Classification, Configuration, LogEntry, BypassDecision) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/types.ts
- [X] T023 [P] Define constants (timeouts, thresholds, defaults) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/constants.ts
- [X] T024 [P] Implement configuration loader with defaults in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/config-loader.ts
- [X] T025 [P] Implement error handler with graceful fallback in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/error-handler.ts
- [X] T026 [P] Implement logger with JSON format in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/logger.ts
- [X] T027 Create hook entry point with stdin/stdout orchestration in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.ts

**Checkpoint**: Foundation ready - hook executes and passes through prompts unchanged

---

## Phase 2: Classification & Improvement Engine

**Purpose**: Implement prompt classification and improvement strategies

**User Stories**: US1 (Automatic Prompt Classification and Improvement), US9 (XML Tag Structuring)

### Tests for Classification & Improvement

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T028 [P] [US1] Test Claude client executes `claude --fork-session --print` in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/claude-client.spec.ts
- [X] T029 [P] [US1] Test Claude client timeout enforcement (5s classification, 30s/60s improvement) in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/claude-client.spec.ts
- [X] T030 [P] [US1] Test Claude client model selection (haiku vs sonnet) in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/claude-client.spec.ts
- [X] T031 [P] [US1] Test classifier returns NONE for well-structured prompts in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.spec.ts
- [X] T032 [P] [US1] Test classifier returns SIMPLE for moderately unclear prompts in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.spec.ts
- [X] T033 [P] [US1] Test classifier returns COMPLEX for vague prompts in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.spec.ts
- [X] T034 [P] [US1] Test classifier defaults to NONE on API failure in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.spec.ts
- [X] T035 [P] [US1] Test classifier includes reasoning in response in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.spec.ts
- [X] T036 [P] [US1] Test improver uses Haiku for SIMPLE classification in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.spec.ts
- [X] T037 [P] [US1] Test improver uses Sonnet for COMPLEX classification in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.spec.ts
- [X] T038 [P] [US1] Test improver preserves original intent and tone in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.spec.ts
- [X] T039 [P] [US1] Test improver injects context from context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.spec.ts
- [X] T040 [P] [US1] Test improver fallback to original on timeout in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.spec.ts
- [X] T041 [P] [US9] Test XML builder applies task/context/constraints tags for COMPLEX in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/xml-builder.spec.ts
- [X] T042 [P] [US9] Test XML builder skips tags for simple prompts in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/xml-builder.spec.ts
- [X] T043 [P] [US9] Test XML builder escapes existing XML content in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/xml-builder.spec.ts
- [X] T044 [P] [US9] Test XML builder supports output_format and examples tags in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/xml-builder.spec.ts

### Implementation for Classification & Improvement

- [X] T045 [P] [US1] Implement Claude client with `claude --fork-session` execution in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/claude-client.ts
- [ ] T046 [P] [US1] Implement classifier with classification prompt template in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/classifier.ts
  - **AUDIT 2026-01-21**: File does NOT exist. Classifier never implemented.
- [ ] T047 [US1] Implement improver with SIMPLE/COMPLEX strategies in /home/gareth/.vs/claude-prompt-improver/hooks/src/services/improver.ts (depends on T045, T046)
  - **AUDIT 2026-01-21**: Improver exists but does NOT use classification. Uses single `config.improverModel` for all prompts. No NONE passthrough, no SIMPLE/COMPLEX differentiation.
- [ ] T048 [P] [US9] Implement XML tag builder with tag selection logic in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/xml-builder.ts
  - **AUDIT 2026-01-21**: File exists but `buildXmlPrompt()` is NOT used in improver. Only `escapeXmlContent()` imported. XML structuring not applied to improved prompts.
- [ ] T049 [US1] [US9] Integrate classification and improvement into hook entry point in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.ts
  - **AUDIT 2026-01-21**: Classification NOT integrated. Hook calls improver directly without classification step. All non-bypassed prompts get improved regardless of whether they need it.

**Checkpoint**: Prompts classified and improved based on complexity level

---

## Phase 3: Bypass Logic & Smart Detection

**Purpose**: Implement bypass mechanisms for efficiency and recursion prevention

**User Stories**: US2 (Smart Bypass Mechanisms)

### Tests for Bypass Logic

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T050 [P] [US2] Test token counter using whitespace-split heuristic in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/token-counter.spec.ts
- [X] T051 [P] [US2] Test token counter accuracy for ~10 token threshold in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/token-counter.spec.ts
- [X] T052 [P] [US2] Test bypass detection for short prompts (≤10 tokens) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T053 [P] [US2] Test bypass detection for #skip tag (tag removed before passthrough) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T054 [P] [US2] Test bypass detection for low context (<5% available) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T055 [P] [US2] Test bypass detection for forked session (permission_mode=fork) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T056 [P] [US2] Test bypass detection for plugin_disabled configuration in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T057 [P] [US2] Test bypass detection priority (first match wins) in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts
- [X] T058 [P] [US2] Test bypass detection completes in <100ms in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.spec.ts

### Implementation for Bypass Logic

- [X] T059 [P] [US2] Implement token counter with whitespace-split heuristic in /home/gareth/.vs/claude-prompt-improver/hooks/src/utils/token-counter.ts
- [X] T060 [US2] Implement bypass detector with priority-ordered conditions in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.ts (depends on T059)
- [X] T061 [US2] Integrate bypass logic into hook entry point (early exit on bypass) in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.ts

**Checkpoint**: Bypass conditions detected and prompts passed through unchanged when appropriate

---

## Phase 4: Context Detection & Injection - Tools/Skills/Agents

**Purpose**: Detect and inject context about available capabilities

**User Stories**: US3 (Context Injection - Tools and Capabilities)

### Tests for Context Detection

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T062 [P] [US3] Test tool detector parses available_tools from stdin in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/tool-detector.spec.ts
- [X] T063 [P] [US3] Test tool detector recognises Read/Write/Edit/Grep/Glob/Bash tools in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/tool-detector.spec.ts
- [X] T064 [P] [US3] Test skill matcher reads skill-rules.json if available in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/skill-matcher.spec.ts
- [X] T065 [P] [US3] Test skill matcher matches prompt keywords to skills in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/skill-matcher.spec.ts
- [X] T066 [P] [US3] Test skill matcher gracefully skips if skill-rules.json missing in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/skill-matcher.spec.ts
- [X] T067 [P] [US3] Test agent suggester reads agent definitions from .claude/agents/ in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/agent-suggester.spec.ts
- [X] T068 [P] [US3] Test agent suggester matches prompt keywords to agent descriptions in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/agent-suggester.spec.ts
- [X] T069 [P] [US3] Test agent suggester gracefully skips if no agents configured in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/agent-suggester.spec.ts
- [X] T070 [P] [US3] Test context builder aggregates from multiple sources in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [X] T071 [P] [US3] Test context builder handles source failures gracefully in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [X] T072 [P] [US3] Test context builder enforces 2s timeout per source in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts
- [X] T073 [P] [US3] Test context builder formats context for injection into improvement in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.spec.ts

### Implementation for Context Detection

- [X] T074 [P] [US3] Implement tool detector with stdin parsing in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/tool-detector.ts
- [X] T075 [P] [US3] Implement skill matcher with keyword matching in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/skill-matcher.ts
- [X] T076 [P] [US3] Implement agent suggester with description matching in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/agent-suggester.ts
- [X] T077 [US3] Implement context builder with source aggregation and timeouts in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts (depends on T074, T075, T076)
- [X] T078 [US3] Integrate context detection into hook workflow in /home/gareth/.vs/claude-prompt-improver/hooks/user-prompt-submit/improve-prompt.ts

**Checkpoint**: Tools, skills, and agents detected and injected into improved prompts

---

## Phase 5: Advanced Context Integrations - Git

**Purpose**: Gather and inject git context (branch, commits, changes)

**User Stories**: US4 (Git Context Enrichment)

### Tests for Git Integration

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T079 [P] [US4] Test git context executes `git log --oneline -5` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T080 [P] [US4] Test git context executes `git status --porcelain` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T081 [P] [US4] Test git context executes `git diff --stat` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T082 [P] [US4] Test git context parses branch name in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T083 [P] [US4] Test git context parses recent commits in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T084 [P] [US4] Test git context parses changed files in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T085 [P] [US4] Test git context enforces 2s timeout per command in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T086 [P] [US4] Test git context gracefully skips if not a git repository in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts
- [X] T087 [P] [US4] Test git context gracefully skips if configuration.integrations.git=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.spec.ts

### Implementation for Git Integration

- [X] T088 [US4] Implement git context gatherer with command execution and parsing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/git-context.ts
- [ ] T089 [US4] Integrate git context into context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
  - **AUDIT 2026-01-21**: context-builder.ts imports git-context but improve-prompt.ts does NOT pass git data to buildContext(). Integration is imported but never invoked.

**Checkpoint**: Git context gathered and injected into prompts when available

---

## Phase 6: Advanced Context Integrations - LSP

**Purpose**: Gather and inject LSP diagnostics (errors/warnings)

**User Stories**: US5 (LSP Diagnostics Integration)

### Tests for LSP Integration

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T090 [P] [US5] Test LSP diagnostics invokes mcp__ide__getDiagnostics in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T091 [P] [US5] Test LSP diagnostics filters to errors first, then warnings in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T092 [P] [US5] Test LSP diagnostics limits to 5 most relevant in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T093 [P] [US5] Test LSP diagnostics matches file paths to prompt keywords in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T094 [P] [US5] Test LSP diagnostics includes file path, line number, message in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T095 [P] [US5] Test LSP diagnostics gracefully skips if LSP not configured in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T096 [P] [US5] Test LSP diagnostics gracefully skips if configuration.integrations.lsp=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts
- [X] T097 [P] [US5] Test LSP diagnostics only injected for debugging-related prompts in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.spec.ts

### Implementation for LSP Integration

- [X] T098 [US5] Implement LSP diagnostics collector with MCP invocation in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/lsp-diagnostics.ts
- [ ] T099 [US5] Integrate LSP diagnostics into context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
  - **AUDIT 2026-01-21**: context-builder.ts imports lsp-diagnostics but improve-prompt.ts does NOT pass LSP data to buildContext(). Integration is imported but never invoked.

**Checkpoint**: LSP diagnostics gathered and injected into debugging prompts when available

---

## Phase 7: Advanced Context Integrations - Specification Awareness

**Purpose**: Parse and inject specification context from .specify/ directory

**User Stories**: US6 (Specification Awareness)

### Tests for Specification Integration

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T100 [P] [US6] Test spec awareness checks for .specify/ directory in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T101 [P] [US6] Test spec awareness parses spec.md frontmatter in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T102 [P] [US6] Test spec awareness extracts user stories from spec.md in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T103 [P] [US6] Test spec awareness parses plan.md phases in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T104 [P] [US6] Test spec awareness parses tasks.md frontmatter for task status in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T105 [P] [US6] Test spec awareness matches user stories to prompt keywords in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T106 [P] [US6] Test spec awareness gracefully skips if .specify/ missing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts
- [X] T107 [P] [US6] Test spec awareness gracefully skips if configuration.integrations.spec=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.spec.ts

### Implementation for Specification Integration

- [X] T108 [US6] Implement spec awareness parser with YAML frontmatter parsing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/spec-awareness.ts
- [ ] T109 [US6] Integrate spec awareness into context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
  - **AUDIT 2026-01-21**: context-builder.ts imports spec-awareness but improve-prompt.ts does NOT pass spec data to buildContext(). Integration is imported but never invoked.

**Checkpoint**: Specification context gathered and injected into prompts when available

---

## Phase 8: Advanced Context Integrations - Memory Plugin

**Purpose**: Detect and integrate with claude-memory-plugin

**User Stories**: US7 (Memory Plugin Integration)

### Tests for Memory Integration

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T110 [P] [US7] Test memory plugin detection at known installation paths (~/.claude/plugins/cache/enhance/claude-memory-plugin/, project .claude/plugins/) in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T111 [P] [US7] Test memory plugin reads index.json in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T112 [P] [US7] Test memory plugin matches memories by title keywords in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T113 [P] [US7] Test memory plugin matches memories by tag keywords in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T114 [P] [US7] Test memory plugin limits to top 3-5 most relevant in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T115 [P] [US7] Test memory plugin gracefully skips if plugin not installed in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T116 [P] [US7] Test memory plugin gracefully skips on index.json parse error in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts
- [X] T117 [P] [US7] Test memory plugin gracefully skips if configuration.integrations.memory=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.spec.ts

### Implementation for Memory Integration

- [X] T118 [US7] Implement memory plugin integration with index.json parsing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/memory-plugin.ts
- [ ] T119 [US7] Integrate memory plugin into context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
  - **AUDIT 2026-01-21**: context-builder.ts imports memory-plugin but improve-prompt.ts does NOT pass memory data to buildContext(). Integration is imported but never invoked.

**Checkpoint**: Memory plugin detected and memories injected into prompts when available

---

## Phase 9: Advanced Context Integrations - Session Context

**Purpose**: Implement session forking and compaction detection

**User Stories**: US8 (Session Context with Compaction Detection)

### Tests for Session Context

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T120 [P] [US8] Test compaction detector calculates available context percentage in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/compaction-detector.spec.ts
- [X] T121 [P] [US8] Test compaction detector skips processing when <5% available in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/compaction-detector.spec.ts
- [X] T122 [P] [US8] Test compaction detector parses context_usage from stdin in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/compaction-detector.spec.ts
- [X] T123 [P] [US8] Test session context forks session with `claude --fork-session` in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.spec.ts
- [X] T124 [P] [US8] Test session context detects forked sessions via permission_mode in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.spec.ts
- [X] T125 [P] [US8] Test session context skips when running in forked session in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.spec.ts
- [X] T126 [P] [US8] Test session context enforces 10s timeout on forking in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.spec.ts
- [X] T127 [P] [US8] Test session context gracefully skips if configuration.integrations.session=false in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.spec.ts

### Implementation for Session Context

- [X] T128 [P] [US8] Implement compaction detector with context usage parsing in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/compaction-detector.ts
- [X] T129 [US8] Implement session context with session forking in /home/gareth/.vs/claude-prompt-improver/hooks/src/integrations/session-context.ts (depends on T128)
- [ ] T130 [US8] Integrate session context into context builder in /home/gareth/.vs/claude-prompt-improver/hooks/src/context/context-builder.ts
  - **AUDIT 2026-01-21**: context-builder.ts imports session-context but improve-prompt.ts does NOT pass session data to buildContext(). Integration is imported but never invoked.
- [X] T131 [US8] Integrate compaction detection into bypass logic in /home/gareth/.vs/claude-prompt-improver/hooks/src/core/bypass-detector.ts

**Checkpoint**: Session context used when appropriate, compaction detection prevents resource exhaustion

---

## Phase 10: Documentation & Polish

**Purpose**: Create comprehensive documentation and prepare for marketplace

**User Stories**: US12 (Plugin Documentation)

### Tests for Documentation

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T132 [P] [US12] Test README.md exists and contains purpose in first paragraph in /home/gareth/.vs/claude-prompt-improver/hooks/tests/docs/readme.spec.ts
- [X] T133 [P] [US12] Test README.md contains installation instructions in /home/gareth/.vs/claude-prompt-improver/hooks/tests/docs/readme.spec.ts
- [X] T134 [P] [US12] Test README.md documents all configuration options in /home/gareth/.vs/claude-prompt-improver/hooks/tests/docs/readme.spec.ts
- [X] T135 [P] [US12] Test README.md contains troubleshooting section in /home/gareth/.vs/claude-prompt-improver/hooks/tests/docs/readme.spec.ts
- [X] T136 [P] [US12] Test CHANGELOG.md exists and follows SemVer format in /home/gareth/.vs/claude-prompt-improver/hooks/tests/docs/changelog.spec.ts

### Implementation for Documentation

- [X] T137 [P] [US12] Create README.md with purpose, installation, configuration, usage, troubleshooting in /home/gareth/.vs/claude-prompt-improver/README.md
- [X] T138 [P] [US12] Create CHANGELOG.md with version history in /home/gareth/.vs/claude-prompt-improver/CHANGELOG.md
- [X] T139 [P] [US12] Create LICENSE file (MIT) in /home/gareth/.vs/claude-prompt-improver/LICENSE
- [X] T140 [P] [US12] Create example prompts and improvements documentation in /home/gareth/.vs/claude-prompt-improver/examples/
- [X] T141 [US12] Add badges (test status, version, license) to README.md in /home/gareth/.vs/claude-prompt-improver/README.md
- [X] T142 [US12] Create quickstart.md validation scenarios in /home/gareth/.vs/claude-prompt-improver/.specify/specs/feature/001-prompt-improver-plugin/quickstart.md

**Checkpoint**: Documentation complete and enables installation/configuration in <10 minutes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Research)**: No dependencies - can start immediately
- **Phase 1 (Foundation)**: Depends on Phase 0 completion
- **Phase 2 (Classification/Improvement)**: Depends on Phase 1 completion
- **Phase 3 (Bypass Logic)**: Depends on Phase 1 completion, can run parallel to Phase 2
- **Phase 4 (Context Detection)**: Depends on Phase 1 completion, can run parallel to Phases 2-3
- **Phases 5-9 (Advanced Integrations)**: All depend on Phase 4 completion, can run in parallel
- **Phase 10 (Documentation)**: Depends on all feature phases (1-9) completion

### User Story Dependencies

- **US1 (Classification/Improvement)**: Foundation (US10, US11) - Phase 1 must complete first
- **US2 (Bypass)**: Foundation (US10, US11) - Phase 1 must complete first
- **US3 (Context Detection)**: Foundation (US10, US11) - Phase 1 must complete first
- **US4-US9 (Advanced Integrations)**: All depend on US3 (Context Detection) - Phase 4 must complete first
- **US12 (Documentation)**: All user stories (US1-US11) - Phases 1-9 must complete first

### Within Each User Story

1. **ALL Tests first** - Write and run ALL tests in the Tests subsection
2. **Verify ALL fail** - Confirm each test fails for the expected reason
3. **ALL Implementation** - Then proceed to Implementation subsection
4. **Verify tests pass** - Each implementation should make corresponding test(s) pass
5. **Refactor** - Clean up while maintaining passing tests

### Parallel Opportunities

- Phase 0 research tasks (T001-T007) can run in parallel
- Phase 1 foundation tests (T008-T019) can run in parallel
- Phase 1 foundation implementation (T020-T026) can run in parallel
- Phase 2 classification tests (T028-T044) can run in parallel
- Phase 2 implementation (T045-T048) can run in parallel
- Phases 2, 3, 4 can start after Phase 1 and run in parallel
- Phases 5-9 can start after Phase 4 and run in parallel
- All tests within each phase can run in parallel (marked with [P])

---

## Implementation Strategy

### MVP First (US1, US2, US3 Only)

1. Complete Phase 0: Research
2. Complete Phase 1: Foundation (US10, US11)
3. Complete Phase 2: Classification & Improvement (US1, US9)
4. Complete Phase 3: Bypass Logic (US2)
5. Complete Phase 4: Context Detection (US3)
6. **STOP and VALIDATE**: Test core functionality independently
7. Optionally add advanced integrations (Phases 5-9)

### Incremental Delivery

1. Foundation ready (Phase 1) → Hook passes through prompts
2. Add Classification/Improvement (Phase 2) → Prompts automatically improved
3. Add Bypass Logic (Phase 3) → Short prompts skip processing
4. Add Context Detection (Phase 4) → Tools/skills/agents injected
5. Add Git Context (Phase 5) → Development prompts enriched
6. Add LSP Diagnostics (Phase 6) → Debugging prompts enhanced
7. Add Spec Awareness (Phase 7) → SDD workflow supported
8. Add Memory Integration (Phase 8) → Past decisions surfaced
9. Add Session Context (Phase 9) → Conversation-aware improvements
10. Add Documentation (Phase 10) → Ready for marketplace

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 and Phase 1 together
2. Once Phase 1 done:
   - Developer A: Phase 2 (Classification/Improvement)
   - Developer B: Phase 3 (Bypass Logic)
   - Developer C: Phase 4 (Context Detection)
3. Once Phase 4 done:
   - Developer A: Phases 5-6 (Git, LSP)
   - Developer B: Phases 7-8 (Spec, Memory)
   - Developer C: Phase 9 (Session Context)
4. Phase 10 (Documentation) completed together

---

## Validation Checklist

Before finalising tasks.md, verify:

- [x] All template sample tasks removed
- [x] Each user story has "### Tests for User Story X" subsection
- [x] Each user story has "### Implementation for User Story X" subsection
- [x] Tests subsection comes BEFORE Implementation subsection in EVERY phase
- [x] NO interleaved test/implementation tasks
- [x] All tasks use absolute file paths
- [x] Parallelisable tasks marked with [P]
- [x] Story-specific tasks tagged with [USX]
- [x] Checkpoints included for each user story
- [x] YAML frontmatter updated with phase mappings

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify ALL tests fail before ANY implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate functionality independently
- TDD status reporting required: `TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌`

---

**Tasks Version**: 1.1.0 | **Status**: Audit Required | **Created**: 2026-01-18 | **Audited**: 2026-01-21

---

## 🚨 AUDIT FINDINGS (2026-01-21)

Implementation audit revealed critical gaps between marked tasks and actual functionality:

### Classification Tasks - REJECTED BY DESIGN

| Task | Status | Reason |
|------|--------|--------|
| **T046** | N/A | Classification requires 2 API calls (classify + improve) = 4-9s extra latency |
| **T047** | N/A | Model selection is config-driven, not classification-driven |
| **T049** | N/A | Single API call architecture is correct; classification rejected |

**Decision**: `decision-prompt-improver-always-improve-no-classification` + `gotcha-classification-requires-2-api-calls-unacceptable-latency`

### Actual Issues (P1 - Still needs fixing)

| Task | Issue | Impact |
|------|-------|--------|
| **T048** | `buildXmlPrompt()` not used | XML structuring never applied to improved prompts |

### Major Issues (P2 - Integrations not wired)

| Task | Issue | Impact |
|------|-------|--------|
| **T089** | Git context not passed to builder | Git enrichment never happens |
| **T099** | LSP diagnostics not passed | Debug context never injected |
| **T109** | Spec awareness not passed | SDD context never injected |
| **T119** | Memory plugin not passed | Past decisions never surfaced |
| **T130** | Session context not passed | Conversation awareness missing |

### Root Cause

The integration files exist and context-builder.ts imports them, but `improve-prompt.ts:buildImprovementContext()` only passes tools/skills/agents - NOT the advanced integration sources.

### Recommended Fix Order

1. **T046** - Create classifier.ts with NONE/SIMPLE/COMPLEX classification
2. **T049** - Wire classification into hook flow
3. **T047** - Update improver to use classification results for model selection
4. **T048** - Wire `buildXmlPrompt()` into improver for COMPLEX prompts
5. **T089-T130** - Update `buildImprovementContext()` to pass integration sources

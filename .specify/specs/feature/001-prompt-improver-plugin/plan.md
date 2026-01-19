---
phases:
  - id: 0
    name: "Research & Technical Decisions"
    description: "Evaluate classification strategies, context gathering approaches, and integration patterns"
    maps_to: []
  - id: 1
    name: "Foundation & Core Architecture"
    description: "Plugin structure, error handling, logging, and configuration system"
    maps_to: ["US1", "US2", "US10", "US11"]
  - id: 2
    name: "Classification & Improvement Engine"
    description: "Prompt classification logic and improvement strategies"
    maps_to: ["US1", "US9"]
  - id: 3
    name: "Context Detection & Injection"
    description: "Tools, skills, agents, and MCP server detection"
    maps_to: ["US3"]
  - id: 4
    name: "Advanced Context Integrations"
    description: "Git, LSP, specification awareness, memory plugin, and session context"
    maps_to: ["US4", "US5", "US6", "US7", "US8"]
  - id: 5
    name: "Documentation & Polish"
    description: "README, examples, troubleshooting, and marketplace preparation"
    maps_to: ["US12"]
---

# Implementation Plan: Claude Prompt Improver Plugin

**Branch**: `001-prompt-improver-plugin` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/specs/feature/001-prompt-improver-plugin/spec.md`

## Summary

The Claude Prompt Improver Plugin automatically enhances user prompts before they reach the main Claude session by:
1. **Classifying** prompts into NONE/SIMPLE/COMPLEX categories using Claude Haiku
2. **Bypassing** short prompts, explicit skips, and resource-constrained scenarios
3. **Enriching** prompts with context from tools, skills, git, LSP, specifications, and memory
4. **Improving** prompts based on classification level (Haiku for SIMPLE, Sonnet for COMPLEX)
5. **Structuring** complex prompts with XML tags for better Claude parsing

**Technical Approach**: Build as a `user-prompt-submit` hook following the established plugin architecture pattern from claude-memory-plugin, with 1:1 test parity (TDD), graceful degradation, and session forking for API calls.

## Technical Context

**Language/Version**: TypeScript (Bun runtime 1.0+)
**Primary Dependencies**:
- Bun runtime for TypeScript execution
- Claude Code CLI (`claude` command with `--fork-session`, `--print` flags)
- Optional: git CLI, LSP via MCP, claude-memory-plugin

**Storage**: File system only
- Configuration: `.claude/prompt-improver-config.json` (optional)
- Logs: `.claude/logs/prompt-improver-latest.log`
- No database or persistent state beyond config/logs

**Testing**: Bun test framework
- Unit tests for all core logic (classifier, improver, context builders)
- Integration tests for hook execution with mocked stdin/Claude CLI
- Contract tests for Claude API response parsing

**Target Platform**: Cross-platform (Linux, macOS, Windows via Bun)
**Project Type**: Single plugin (hook-based)

**Performance Goals**:
- Bypass detection: <100ms (100% of cases)
- Classification: <5 seconds (95% of cases)
- Simple improvement: <30 seconds (90% of cases)
- Complex improvement: <60 seconds (90% of cases)
- Total hook execution: <90 seconds maximum

**Constraints**:
- Zero prompt blocking: all failures must pass through original prompt
- Graceful degradation: optional integrations (git/LSP/spec/memory) skip on unavailability
- Session isolation: use `--fork-session` to avoid context pollution
- Recursion prevention: detect forked sessions and bypass immediately

**Scale/Scope**:
- Expected usage: 20-100+ prompts per day per user
- Context sources: 7 independent integrations (tools, skills, agents, git, LSP, spec, memory)
- Log rotation: manage unbounded growth of log files
- Token counting: heuristic approach (whitespace split) sufficient for ~10 token threshold

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### P1: Plugin Architecture Compliance
- ✅ **Pass**: Plugin structure follows official architecture:
  - `.claude-plugin/plugin.json` for metadata
  - `hooks/user-prompt-submit/` for hook entry point
  - `hooks/src/` for internal implementation (not in `.claude-plugin/`)
  - `README.md` at root for documentation
- ✅ **Pass**: Each component independently functional (classifier, improver, context builders can be used standalone)

### P2: Test-First Development (NON-NEGOTIABLE)
- ✅ **Pass**: TDD enforced with Red-Green-Refactor cycle
- ✅ **Pass**: 1:1 test parity: every `.ts` has adjacent `.spec.ts`
- ✅ **Pass**: Test tasks grouped BEFORE implementation tasks in each phase
- ✅ **Pass**: All tests independently executable
- ✅ **Pass**: TDD status reporting included in task completion

### P3: GitHub Flow Discipline
- ✅ **Pass**: Feature branch `001-prompt-improver-plugin` created
- ✅ **Pass**: No direct commits to `main` (all via PR)
- ✅ **Pass**: Commit messages follow conventional format: `feat(scope): description`
- ✅ **Pass**: Branch deleted after merge

### P4: Observability & Debuggability
- ✅ **Pass**: Logging strategy defined (`.claude/logs/prompt-improver-latest.log`)
- ✅ **Pass**: Hook feedback via stdout (display improved prompt before execution)
- ✅ **Pass**: JSON logging format for programmatic consumption
- ✅ **Pass**: Error messages actionable (include bypass reason, failure context)

### P5: Simplicity & YAGNI
- ✅ **Pass**: Solves concrete problem: automatic prompt improvement
- ✅ **Pass**: No speculative features beyond documented requirements
- ⚠️ **Complexity Justified**: 7 context sources (tools/skills/git/LSP/spec/memory/session)
  - **Rationale**: Each source independently testable, optional (graceful degradation), and delivers distinct value
  - **Simpler alternatives rejected**: Single context source insufficient for contextual awareness (core value proposition)
  - **Maintenance cost**: Isolated modules reduce coupling, failure in one doesn't affect others

### P6: Semantic Versioning
- ✅ **Pass**: Version tracked in `plugin.json` (start at `1.0.0` on initial release)
- ✅ **Pass**: CHANGELOG.md planned for Phase 5
- ✅ **Pass**: Git tags for releases: `v1.0.0`, `v1.1.0`, etc.

**Constitution Re-evaluation Post-Design**: ✅ No new violations introduced

## Project Structure

### Documentation (this feature)

```
.specify/specs/feature/001-prompt-improver-plugin/
├── plan.md              # This file
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (validation scenarios)
├── contracts/           # Phase 1 output (API contracts)
│   ├── classification-api.yaml
│   ├── improvement-api.yaml
│   └── hook-interface.yaml
└── tasks.md             # Phase 2+ output (generated by /speckit:tasks)
```

### Source Code (repository root)

```
claude-prompt-improver/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata (name, version, description)
├── hooks/
│   ├── user-prompt-submit/
│   │   ├── improve-prompt.ts    # Hook entry point
│   │   └── improve-prompt.spec.ts
│   └── src/
│       ├── core/
│       │   ├── types.ts                 # TypeScript interfaces and types
│       │   ├── types.spec.ts
│       │   ├── error-handler.ts         # Graceful error handling
│       │   ├── error-handler.spec.ts
│       │   ├── constants.ts             # Timeouts, thresholds, defaults
│       │   └── constants.spec.ts
│       ├── services/
│       │   ├── classifier.ts            # Prompt classification logic
│       │   ├── classifier.spec.ts
│       │   ├── improver.ts              # Prompt improvement logic
│       │   ├── improver.spec.ts
│       │   ├── claude-client.ts         # Claude API via `claude` CLI
│       │   └── claude-client.spec.ts
│       ├── context/
│       │   ├── tool-detector.ts         # Detect available Claude Code tools
│       │   ├── tool-detector.spec.ts
│       │   ├── skill-matcher.ts         # Match skills to prompt keywords
│       │   ├── skill-matcher.spec.ts
│       │   ├── agent-suggester.ts       # Suggest relevant agents
│       │   ├── agent-suggester.spec.ts
│       │   ├── context-builder.ts       # Aggregate context from sources
│       │   └── context-builder.spec.ts
│       ├── integrations/
│       │   ├── memory-plugin.ts         # Memory plugin integration
│       │   ├── memory-plugin.spec.ts
│       │   ├── git-context.ts           # Git commits, branch, changes
│       │   ├── git-context.spec.ts
│       │   ├── lsp-diagnostics.ts       # LSP errors/warnings
│       │   ├── lsp-diagnostics.spec.ts
│       │   ├── spec-awareness.ts        # .specify/ integration
│       │   ├── spec-awareness.spec.ts
│       │   ├── session-context.ts       # Session forking
│       │   ├── session-context.spec.ts
│       │   ├── compaction-detector.ts   # Context availability check
│       │   └── compaction-detector.spec.ts
│       └── utils/
│           ├── token-counter.ts         # Simple token counting
│           ├── token-counter.spec.ts
│           ├── xml-builder.ts           # XML tag structuring
│           └── xml-builder.spec.ts
├── README.md                    # Plugin documentation
├── CHANGELOG.md                 # Version history
├── LICENSE                      # MIT License
└── package.json                 # Bun dependencies
```

**Structure Decision**: Single plugin with hooks-based architecture. All business logic resides in `hooks/src/` subdirectories organised by concern (core, services, context, integrations, utils). This follows the claude-memory-plugin pattern and keeps the hook entry point minimal (orchestration only).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 7 context sources (P5) | Each source provides distinct contextual value (tools vs git vs LSP vs memory) | Single context source would miss critical information (e.g., LSP diagnostics for debugging prompts, git context for development prompts, memory for consistency). All sources optional with graceful degradation, so complexity is modular. |

---

## Phase 0: Research & Technical Decisions

**Purpose**: Establish technical direction, evaluate classification strategies, validate session forking approach, and confirm integration patterns.

**Deliverables**:
- `research.md` - Technical decisions and rationale
- Proof-of-concept: Session forking with `claude --fork-session`
- Proof-of-concept: Classification prompt design

**Research Questions**:
1. **Classification Strategy**: What classification prompt reliably distinguishes NONE/SIMPLE/COMPLEX? Test with 20+ sample prompts.
2. **Session Forking**: Does `claude --fork-session` isolate context as expected? Can we detect forked sessions via stdin?
3. **Context Parsing**: How to extract context info (tools, skills, MCP servers) from hook stdin input?
4. **Token Counting**: Is whitespace-split heuristic accurate enough for ~10 token threshold?
5. **XML Tag Selection**: Which Anthropic-recommended tags improve parsing? When to apply vs when to skip?
6. **Memory Plugin Detection**: Where does claude-memory-plugin store `index.json`? How to match memories to prompts?
7. **LSP Integration**: How to invoke `mcp__ide__getDiagnostics` from hook context?

**Success Criteria**:
- All "NEEDS CLARIFICATION" items in Technical Context resolved
- Classification prompt achieves >80% accuracy on test set
- Session forking confirmed to prevent recursion
- All integration patterns validated with examples

**Estimated Duration**: 1-2 days

---

## Phase 1: Foundation & Core Architecture

**Purpose**: Build plugin skeleton, error handling, logging, and configuration system.

**User Stories**: Maps to **US10 (Configuration)**, **US11 (Logging)**

**Deliverables**:
- `data-model.md` - Entity definitions (Prompt, ImprovedPrompt, Context, Classification, Configuration, LogEntry)
- `quickstart.md` - Setup and validation instructions
- `contracts/` - API contracts for classification, improvement, and hook interface
- Plugin scaffold with working hook entry point
- Error handler with graceful fallback
- Logging system with JSON output
- Configuration loader with defaults

**Implementation Outline**:
1. **Plugin Metadata** (`plugin.json`)
   - Name: `claude-prompt-improver`
   - Version: `0.1.0` (pre-release during development)
   - Description, author, license
   - Hook registration: `user-prompt-submit`

2. **Hook Entry Point** (`improve-prompt.ts`)
   - Read stdin for prompt and context info
   - Orchestrate: bypass detection → classification → improvement → output
   - Graceful error handling (pass through on failure)

3. **Core Types** (`types.ts`)
   - `Prompt`, `ImprovedPrompt`, `Context`, `Classification`, `Configuration`, `LogEntry`
   - TypeScript interfaces for type safety

4. **Error Handler** (`error-handler.ts`)
   - Wrap operations in try-catch
   - Log errors, return original prompt
   - Pattern from claude-memory-plugin

5. **Logging System** (integrated into hook)
   - Write to `.claude/logs/prompt-improver-latest.log`
   - JSON format: `{ timestamp, original, improved, classification, model, latency, bypass }`
   - Human-readable output to stdout

6. **Configuration Loader** (integrated into hook)
   - Read from `.claude/prompt-improver-config.json` (optional)
   - Defaults: `{ enabled: true, shortPromptThreshold: 10, integrations: { git: true, lsp: true, spec: true, memory: true, session: true } }`
   - Environment variable expansion: `${VAR}` and `${VAR:-default}`

**Dependencies**: Phase 0 research completed

**Success Criteria**:
- Hook executes and passes through prompts unchanged (no processing logic yet)
- Errors logged without blocking prompts
- Configuration loaded with defaults
- All foundation components have 1:1 test parity

**Estimated Duration**: 2-3 days

---

## Phase 2: Classification & Improvement Engine

**Purpose**: Implement prompt classification and improvement strategies using Claude API.

**User Stories**: Maps to **US1 (Automatic Prompt Classification and Improvement)**, **US9 (XML Tag Structuring)**

**Deliverables**:
- Working classification service (NONE/SIMPLE/COMPLEX detection)
- Improvement service (Haiku for SIMPLE, Sonnet for COMPLEX)
- XML tag builder for structured prompts
- Claude CLI client with session forking

**Implementation Outline**:
1. **Claude Client** (`claude-client.ts`)
   - Execute `claude --fork-session --print "prompt"` for API calls
   - Parse JSON responses
   - Timeout enforcement (5s for classification, 30s/60s for improvement)
   - Model selection: Haiku vs Sonnet

2. **Classifier** (`classifier.ts`)
   - Build classification system prompt with context awareness
   - Call Claude Haiku with timeout
   - Parse JSON response: `{ classification: "NONE"|"SIMPLE"|"COMPLEX", reasoning: string }`
   - Default to NONE on failure

3. **Improver** (`improver.ts`)
   - Build improvement prompt based on classification level
   - SIMPLE: light enhancements (Haiku, 30s timeout)
   - COMPLEX: comprehensive restructuring (Sonnet, 60s timeout)
   - Inject context from context builder
   - Preserve original intent and tone

4. **XML Tag Builder** (`xml-builder.ts`)
   - Apply tags only when beneficial: `<task>`, `<context>`, `<constraints>`, `<output_format>`, `<examples>`
   - Detection logic: when to use tags vs plain text
   - Escape existing XML-like content in user prompts

**Dependencies**: Phase 1 foundation completed

**Success Criteria**:
- Classification accuracy >80% on test prompts
- Improvements preserve user intent (manual review)
- XML tags applied appropriately (no over-verbosity)
- All services have 1:1 test parity

**Estimated Duration**: 3-4 days

---

## Phase 3: Context Detection & Injection

**Purpose**: Detect and inject context about available tools, skills, agents, and MCP servers.

**User Stories**: Maps to **US3 (Context Injection - Tools and Capabilities)**

**Deliverables**:
- Tool detector (Read, Write, Edit, Grep, Glob, Bash)
- Skill matcher (memory, typescript-expert, etc.)
- Agent suggester (match keywords to agent descriptions)
- Context builder (aggregate from all sources)

**Implementation Outline**:
1. **Tool Detector** (`tool-detector.ts`)
   - Parse hook stdin for available tools
   - Known Claude Code tools: Read, Write, Edit, Grep, Glob, Bash, WebSearch, WebFetch
   - Return list of detected tools

2. **Skill Matcher** (`skill-matcher.ts`)
   - Read `skill-rules.json` if available
   - Match prompt keywords against skill names
   - Example: "typescript" → typescript-expert skill
   - Return matched skills

3. **Agent Suggester** (`agent-suggester.ts`)
   - Read agent definitions from `.claude/agents/` if available
   - Match prompt keywords against agent descriptions
   - Return suggested agents

4. **Context Builder** (`context-builder.ts`)
   - Aggregate context from all sources
   - Format for injection into improvement prompt
   - Handle failures gracefully (skip unavailable sources)
   - Timeout per source: 2 seconds

**Dependencies**: Phase 2 classification/improvement completed

**Success Criteria**:
- Context detection works with various tool configurations
- Skills and agents matched accurately by keywords
- Context builder aggregates from all sources
- All components have 1:1 test parity

**Estimated Duration**: 2-3 days

---

## Phase 4: Advanced Context Integrations

**Purpose**: Implement git, LSP, specification, memory, and session context gathering.

**User Stories**: Maps to **US4 (Git Context)**, **US5 (LSP Diagnostics)**, **US6 (Specification Awareness)**, **US7 (Memory Plugin)**, **US8 (Session Context with Compaction Detection)**

**Deliverables**:
- Git context gatherer (branch, commits, changes)
- LSP diagnostics collector (errors/warnings)
- Specification parser (.specify/ integration)
- Memory plugin integration (index.json matching)
- Session context via forking
- Compaction detector (context availability check)

**Implementation Outline**:
1. **Git Context** (`git-context.ts`)
   - Execute: `git log --oneline -5`, `git status --porcelain`, `git diff --stat`
   - Timeout: 2 seconds per command
   - Parse output, return branch/commits/changes
   - Graceful skip if not a git repository

2. **LSP Diagnostics** (`lsp-diagnostics.ts`)
   - Invoke `mcp__ide__getDiagnostics` if available
   - Filter to errors first, then warnings
   - Match file paths to prompt keywords
   - Limit to 5 most relevant diagnostics
   - Graceful skip if LSP not configured

3. **Specification Awareness** (`spec-awareness.ts`)
   - Check for `.specify/` directory
   - Parse `spec.md`, `plan.md`, `tasks.md` if present
   - Extract frontmatter for task status
   - Match user stories to prompt keywords
   - Graceful skip if no specifications

4. **Memory Plugin Integration** (`memory-plugin.ts`)
   - Detect claude-memory-plugin at known paths
   - Read `index.json` for memory index
   - Match memories by title/tag keywords
   - Limit to top 3-5 most relevant
   - Graceful skip if plugin not installed

5. **Session Context** (`session-context.ts`)
   - Fork session for conversation history awareness
   - Use `claude --fork-session` to access prior context
   - Detect forked sessions via `permission_mode` in stdin
   - Skip if running in forked session (recursion prevention)

6. **Compaction Detector** (`compaction-detector.ts`)
   - Parse context usage from hook stdin
   - Calculate: `available_context_percentage = (max - used) / max * 100`
   - Skip improvement if available < 5%
   - Check auto-compaction settings

**Dependencies**: Phase 3 context detection completed

**Success Criteria**:
- All integrations work independently (can fail without affecting others)
- Git context gathered correctly from test repository
- LSP diagnostics filtered and prioritised
- Specifications parsed and matched
- Memory plugin detected and integrated
- Session context used when appropriate, skipped near compaction
- All integrations have 1:1 test parity

**Estimated Duration**: 4-5 days

---

## Phase 5: Bypass Logic & Final Integration

**Purpose**: Implement bypass mechanisms and integrate all components.

**User Stories**: Maps to **US2 (Smart Bypass Mechanisms)**

**Deliverables**:
- Bypass detector (short prompts, #skip tag, low context, forked session)
- Full end-to-end integration
- Performance optimisation

**Implementation Outline**:
1. **Bypass Detection** (integrated into `improve-prompt.ts`)
   - Check #skip tag (remove before passthrough)
   - Token count ≤10 (use token-counter.ts)
   - Available context <5% (use compaction-detector.ts)
   - Forked session detection (permission_mode in stdin)
   - Exit early on first match (performance optimisation)

2. **Token Counter** (`token-counter.ts`)
   - Simple heuristic: `prompt.split(/\s+/).length`
   - Sufficient accuracy for ~10 token threshold

3. **End-to-End Integration**
   - Wire all components together in hook entry point
   - Orchestration: bypass → classification → context gathering → improvement → output
   - Timeout enforcement at each stage

**Dependencies**: Phases 1-4 completed

**Success Criteria**:
- Bypass detection <100ms for all cases
- All bypass conditions tested and working
- End-to-end flow processes prompts correctly
- All bypass logic has 1:1 test parity

**Estimated Duration**: 2 days

---

## Phase 6: Documentation & Polish

**Purpose**: Create comprehensive README, examples, troubleshooting, and prepare for marketplace.

**User Stories**: Maps to **US12 (Plugin Documentation)**

**Deliverables**:
- README.md with installation, configuration, usage, troubleshooting
- CHANGELOG.md for version tracking
- Example prompts and improvements
- Marketplace submission assets

**Implementation Outline**:
1. **README.md**
   - Purpose and value proposition (first paragraph)
   - Installation instructions (Claude marketplace + manual)
   - Configuration options with defaults
   - Usage examples (before/after prompts)
   - Troubleshooting (common issues and solutions)
   - Badges (test status, version, license)

2. **CHANGELOG.md**
   - Version history (SemVer format)
   - Release notes for each version

3. **Examples**
   - 10+ example prompts with improvements
   - Demonstrate each classification level
   - Show context injection in action

4. **Marketplace Preparation**
   - Screenshots/GIFs of plugin in action
   - Description for marketplace listing
   - Tags and categories

**Dependencies**: Phases 1-5 completed

**Success Criteria**:
- README enables installation in <10 minutes
- All configuration options documented
- Troubleshooting section addresses common issues
- Marketplace assets ready

**Estimated Duration**: 2 days

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Classification inaccuracy** | Users receive inappropriate improvements (over-engineered SIMPLE prompts or under-improved COMPLEX prompts) | Medium | Extensive testing with diverse prompt corpus, iterate on classification prompt, default to NONE on ambiguity |
| **API latency** | Hook adds 30-60s delay to every prompt, degrading UX | Medium | Implement bypass logic aggressively (short prompts, #skip tag), optimise classification prompt, set strict timeouts |
| **Improved prompt too long** | Enhanced prompt approaches context limits, wasting space | Low | Monitor improved prompt length, fallback to SIMPLE or original if approaching limits, limit context injection (top 5 diagnostics, top 3 memories) |
| **Session forking fails** | Cannot isolate improvement calls, risk of recursion or context pollution | Low | Detect forked sessions via stdin, bypass immediately, test recursion prevention thoroughly |
| **Integration failures** | Git/LSP/spec/memory unavailable or slow, blocking improvement | Medium | Graceful degradation (skip unavailable sources), 2s timeout per source, continue with available context |
| **Memory plugin schema changes** | claude-memory-plugin updates break `index.json` parsing | Low | Version detection, fallback to skip on parse errors, log incompatibility |
| **User intent lost** | Improvements change user's meaning or tone | High | Extensive manual review, preserve original terminology, instruct Claude to maintain intent, collect user feedback |
| **Log file growth** | `.claude/logs/prompt-improver-latest.log` grows unbounded | Medium | Implement rotation strategy (max 10MB, keep last 7 days), truncate on startup if oversized |
| **Configuration conflicts** | User settings incompatible with plugin expectations | Low | Validate configuration on load, use sensible defaults, document all options clearly |
| **Cross-platform issues** | Bun/git/LSP behaviour differs on Windows vs Linux/macOS | Low | Test on multiple platforms, use cross-platform path handling, handle platform-specific command syntax |

---

## Next Steps

After plan approval:
1. Execute Phase 0 research (1-2 days)
2. Generate detailed task breakdown with `/speckit:tasks`
3. Begin TDD implementation starting with Phase 1
4. Iterate through phases with continuous testing
5. Submit to GaZmagik/enhance marketplace

**Total Estimated Duration**: 15-20 days of focused development

---

**Plan Version**: 1.0.0 | **Status**: Draft | **Created**: 2026-01-18

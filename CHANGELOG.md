# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.3] - 2026-01-31

### Fixed

- **Process leak in forked sessions** - Forked Claude sessions spawned child processes (LSP servers, git, chrome-devtools) that weren't cleaned up, causing process accumulation and system slowdown
  - Added `--tools ""` flag to disable all tools in forked sessions (prompt improvement doesn't need tool access)
  - Added explicit `proc.kill()` in finally block to ensure process cleanup even on successful completion
  - Prevents zombie process accumulation and resource exhaustion

## [1.7.2] - 2026-01-27

### Fixed

- Added missing `pluginResources` injection in improvement prompt context (was gathered but never injected)
- Improvement agent now references relevant tools, skills, and agents from its system prompt when they could help the user's task

## [1.7.1] - 2026-01-24

### Fixed

- Removed redundant `hooks` field from plugin.json that was causing "Duplicate hooks file detected" error (hooks.json already exists in default location)
- Synced package.json version to 1.7.1 (was stuck at 1.1.2)

## [1.7.0] - 2026-01-24

### Added

- **Plugin resources wiring** - Complete the plugin resources pipeline from discovery to prompt injection
  - Wired `pluginResources` context through `improve-prompt.ts` (was gathered but never used in v1.6.0)
  - Added `integrations.pluginResources` toggle to configuration for enabling/disabling feature
  - Plugin resource context now flows through: discover → build → format → inject

- **Output styles discovery** - Scan and include output styles from plugins
  - New `OutputStyleInfo` interface with name and description fields
  - Added `outputStyles` array to `PluginInfo` interface
  - Scans `output-styles/` directory in plugins for `.md` files with YAML frontmatter

- **Component path security validation** - Secure path handling for plugin components
  - New `normaliseComponentPath()` rejects absolute paths and parent traversal (`..`)
  - New `normaliseComponentPaths()` handles string and array formats per Claude Code spec
  - Custom paths SUPPLEMENT default directories (don't replace them)
  - Falls back to defaults when all paths are invalid

- **Plugin manifest hooks field** - Declares hook location in plugin.json
  - Added `"hooks": "./hooks/hooks.json"` to plugin manifest
  - Enables Claude Code to locate hooks without hardcoded paths

### Changed

- `ContextSource` type now includes `pluginResources` as a valid source
- `ImprovementContext` interface includes `pluginResources` field
- Default integrations enable `pluginResources` by default

### Technical Details

- Added 40 new tests across type validation, wiring, plugin scanning, and E2E integration
- Total test count: 830+ tests passing
- All four wiring points in `improve-prompt.ts` now correctly handle `pluginResources`

## [1.6.0] - 2026-01-24

### Added

- **Structured resource discovery** - Plugin scanning infrastructure for prompt improvement
  - New `plugin-scanner.ts` module scans `~/.claude/plugins/cache/enhance/` for installed plugins
  - Extracts skills, agents, and commands with YAML frontmatter parsing
  - MCP server discovery from `.mcp.json` files (user, project, and plugin levels)
  - New `resource-formatter.ts` module formats resources as structured XML sections

- **XML resource sections in improved prompts** - Provides explicit resource context
  - `<skills>` - Available skills with plugin:name format and descriptions
  - `<agents>` - Available agents with model, capabilities, spawn conditions
  - `<commands>` - Available /commands with descriptions and triggers
  - `<mcp>` - MCP servers and their capabilities
  - `<memory>` - Memory skill recommendations (deliberation, gotcha checks)
  - `<lsp>` - LSP operations when TypeScript/JavaScript detected
  - `<speckit>` - Specification status when .specify/ directory exists

- **Memory skill integration** - Special handling for claude-memory-plugin
  - Detects deliberation keywords (brainstorm, pros/cons, trade-offs, decide)
  - Suggests `memory think` workflow for deliberation prompts
  - Recommends gotcha checks before significant work

- **Language detection** - Detects project language from config files
  - TypeScript (tsconfig.json), JavaScript (package.json)
  - Python (pyproject.toml), Rust (Cargo.toml), Go (go.mod), etc.
  - Enables LSP capability suggestions for detected languages

### Removed

- **Legacy JSON configuration** - Removed backwards compatibility for `.claude/prompt-improver-config.json`
  - Use `.claude/prompt-improver.local.md` (markdown with YAML frontmatter) instead

### Technical Details

- Added 40 new tests for plugin scanning and resource formatting
- YAML frontmatter parser handles malformed files gracefully
- XML escaping for special characters in resource descriptions

## [1.5.2] - 2026-01-23

### Fixed

- **Dynamic discovery now formats all resource types** - Previously only agents were included in improved prompts
  - Added `formatSkillSuggestions()` for skill recommendations
  - Added `formatCommandSuggestions()` for command recommendations
  - Added `formatOutputStyleSuggestions()` for output style recommendations
  - All matched resources now appear in `<discovered_resources>` section

- **LSP diagnostics no longer stubbed** - Implemented real TypeScript diagnostics gathering
  - Runs `tsc --noEmit` to gather compiler errors and warnings
  - Includes 5-second timeout to prevent hanging
  - Gracefully falls back to empty array if tsc unavailable
  - Note: MCP tools not accessible from hooks; uses subprocess instead

### Technical Details

- Added format functions for skills, commands, and output styles in `dynamic-discovery.ts`
- Updated `formatDynamicContext()` to include all matched resource types
- Implemented `gatherTypeScriptDiagnostics()` in `lsp-diagnostics.ts`

## [1.5.1] - 2026-01-22

### Fixed

- **Forked session context bleed** - Improved prompt now correctly identifies itself as a forked session agent
  - Added explicit "[FORKED SESSION - PROMPT IMPROVEMENT AGENT]" framing
  - Clarifies model is NOT the assistant from previous conversation
  - Added explicit boundary instructions (DO NOT continue conversation, DO NOT ask questions)
  - Prevents model from responding to conversation context instead of performing improvement

### Technical Details

- Strengthened `IMPROVEMENT_PROMPT_TEMPLATE` with clear role separation
- Added tests for forked session framing verification

## [1.5.0] - 2026-01-22

### Added

- **Tools context from Claude Code** - Now parses `available_tools` from stdin
  - Extracts tools provided by Claude Code (Read, Write, Edit, MCP tools, etc.)
  - Injects into improved prompts as `<available_tools>` section

- **Dynamic discovery integration** - Discovers skills and agents at runtime
  - Scans `.claude/` directories for available resources
  - Matches skills and agents to prompt keywords
  - Injects as `<available_skills>`, `<suggested_agents>`, `<discovered_resources>` sections
  - New `dynamicDiscovery` config toggle (default: `true`)

### Fixed

- **Context sources now actually wired** - Previously, tools/skills/agents infrastructure existed but was never connected
  - `available_tools` was sent by Claude Code but never extracted from stdin
  - Dynamic discovery was fully implemented but never invoked from entry point

### Technical Details

- Added `available_tools` extraction in `parseHookInput()`
- Added `dynamicDiscovery` to `IntegrationToggles` type
- Wired `dynamicDiscoveryOptions` in `buildImprovementContext()`
- Added `dynamicDiscovery` to `ContextSource` type and `ImprovementContext`

## [1.4.0] - 2026-01-22

### Added

- **Transcript-based context detection** - The `low_context` bypass now actually works
  - Claude Code doesn't provide `context_usage` to UserPromptSubmit hooks
  - Now parses the session transcript (`.jsonl`) to calculate context usage
  - Uses last assistant message's token counts (input + output + cache tokens)
  - Accounts for autocompact buffer (22.5% reserved = 155K usable of 200K)
  - Bypasses prompt improvement when <5% context remaining

### Changed

- **Hook timeout increased to 120s** - Supports Opus model on large sessions
  - Opus can take ~87s on 193MB transcripts
  - Previous 90s timeout was insufficient

### Technical Details

- Added `calculateContextFromTranscript()` to compaction-detector.ts
- Added `getUsableContextWindow()` accounting for autocompact buffer
- Added `transcript_path` to HookContext type
- Falls back gracefully if transcript unavailable

## [1.3.3] - 2026-01-22

### Fixed

- **Claude now receives the improved prompt** - Fixed `additionalContext` output format
  - Was outputting `additionalContext` at top level of JSON
  - Must be wrapped in `hookSpecificOutput` per Claude Code docs
  - See: https://code.claude.com/docs/en/hooks#hook-output

### Technical Details

- Changed `serializeHookOutput()` to wrap `additionalContext` inside `hookSpecificOutput`
- Added `hookEventName: 'UserPromptSubmit'` to the output structure

## [1.3.2] - 2026-01-22

### Fixed

- **Fork-session now works correctly** - Three critical fixes discovered through debugging:
  1. **Added `--debug` flag** - CLI bug causes commands to hang without it
  2. **Removed `--output-format json`** - Causes fork-session to hang indefinitely
  3. **Run from project directory** - Fork-session can only find session files from the project cwd, not /tmp

### Technical Details

- Added `--debug` flag to buildClaudeCommand() args (CLI bug workaround)
- Removed `--output-format json` which caused hangs with fork-session
- Added `cwd` parameter to ClaudeClientOptions, passed through from hook input
- Changed default cwd from tmpdir() to project directory when available
- Updated improver.ts and improve-prompt.ts to pass cwd through the call chain

## [1.3.1] - 2026-01-22

### Fixed

- **Conversation context now available to prompt improver** - Added `--resume ${sessionId} --fork-session` to Claude CLI invocation, allowing the improver to access conversation history and understand terms/acronyms defined earlier in the session
- **Removed clarifying questions behaviour** - Changed system prompt instruction from "SUGGEST clarifying questions if the prompt is very vague" to "NEVER ask clarifying questions - make reasonable assumptions based on available context"

### Technical Details

- Updated `buildClaudeCommand()` in claude-client.ts to conditionally add fork-session args when sessionId is available
- The fork-session pattern was restored from the original ~/.claude/hooks implementation

### Known Issues

- **BROKEN**: Fork-session was hanging/timing out - missing `--output-format json` flag (fixed in v1.3.2)

## [1.3.0] - 2026-01-21

### Added

- **Dynamic Context Injection** - Runtime discovery of agents, commands, skills, and output styles
  - Scans `~/.claude/` (global) and `.claude/` (local) directories automatically
  - Parses YAML frontmatter from markdown definitions for metadata extraction
  - Local scope takes precedence over global for same-named resources
  - Injects matched suggestions into improved prompts based on keyword relevance

- **Filesystem Discovery Infrastructure**
  - `discoverAgents()` - Scans agents/ directories for .md files
  - `discoverCommands()` - Scans commands/ directories for .md files
  - `discoverSkills()` - Scans skills/ directories for SKILL.md files
  - `discoverOutputStyles()` - Scans output-styles/ directories for .md files

- **Performance Optimisations**
  - LRU cache with mtime-based invalidation (MAX_CACHE_SIZE=50)
  - 2-second timeout per directory scan with Promise.race
  - Monotonic counter for reliable LRU ordering

- **Security Hardening**
  - Path validation rejecting `..`, null bytes, and shell metacharacters
  - `isValidDiscoveryPath()` and `validateDiscoveryPath()` utilities

- **Memory Think Special Handling**
  - Detects `memory think create/add/counter/branch/conclude` patterns
  - Injects enhanced suggestions for `--agent` and `--style` options
  - Special formatting distinguishes deliberation context from regular discovery

### Technical Details

- 81 new tests across 4 test suites (path-validator, discovery-cache, directory-scanner, dynamic-discovery)
- MockFileSystem pattern enables deterministic testing without real filesystem
- Integrated into context-builder.ts via Promise.allSettled pattern
- Full SDD workflow: spec.md, plan.md, tasks.md, research.md, quickstart.md
- 694 total tests passing

## [1.1.2] - 2026-01-20

### Fixed

- **Hook command syntax corrected** - Removed `run` from hook command (`bun run` → `bun`)
  - Hook was using `bun run` which is for package.json scripts
  - Changed to `bun` for direct TypeScript execution (matches claude-memory-plugin pattern)
  - Fixes silent hook failures preventing plugin from running when installed

### Technical Details

- Updated hooks.json command from `bun run ${CLAUDE_PLUGIN_ROOT}/...` to `bun ${CLAUDE_PLUGIN_ROOT}/...`
- This matches the pattern used by other working plugins (claude-memory-plugin)

## [1.1.1] - 2026-01-20

### Fixed

- **displayImprovedPrompt config flag now functional** - Wired up the `logging.displayImprovedPrompt` configuration option that existed but was never checked
  - When `true` (default): Shows improved prompt text in systemMessage after metrics
  - When `false`: Shows only status and metrics, improved prompt remains hidden
  - Improved prompt always included in additionalContext for Claude regardless of display setting

### Technical Details

- Added `improvedPrompt` field to `VisibilityInfo` type
- Updated message formatter with conditional display logic
- All 615 tests passing

## [1.1.0] - 2026-01-19

### Breaking Changes

- **Removed classification system entirely** - No more NONE/SIMPLE/COMPLEX tiers
- **Always-improve architecture** - All prompts >10 tokens are now improved (unless bypassed)
- **Single API call** - Direct improvement without classification step (80-90% faster)
- **Removed ClassificationLevel type** - Simplified type system

### Added

- **Opus model support** - Can now use opus model via `improverModel` config
- **improverModel configuration** - Select model in config: `haiku` (fast), `sonnet` (balanced), or `opus` (highest quality)
- **Config-driven short prompt threshold** - `shortPromptThreshold` now configurable instead of hardcoded
- **Opus timeout test** - Integration test verifying 90s timeout for opus model

### Changed

- **Model IDs updated** - Correct Claude 4.5 model identifiers:
  - `claude-haiku-4-5-20251001`
  - `claude-sonnet-4-5-20250929`
  - `claude-opus-4-5-20251101`
- **Faster execution** - Single API call reduces latency from 9-14s to 5-10s
- **Improved code structure** - Extracted helper functions for better readability (497 lines from 576)

### Security

- **HIGH: Fixed command injection vulnerability** - Refactored `executeGitCommand` to use array-based arguments instead of string splitting
- **MEDIUM: Fixed path traversal vulnerability** - Added validation for `featurePath` parameter to reject `..` sequences and null bytes
- **Established mandatory security review gate** - All feature PRs now require security audit before merge
- **Array-based process spawning** - All git commands now use safe array format
- **Input validation** - Path parameters validated to prevent traversal attacks

### Fixed

- Error handling consistency - Added try/catch wrapper around `improvePrompt` with passthrough fallback
- Documentation accuracy - Removed all classification system references from README
- Config documentation - Updated to show `improverModel` instead of deprecated `defaultSimpleModel`/`defaultComplexModel`

### Deprecated

- `defaultSimpleModel` config field - Use `improverModel` instead
- `defaultComplexModel` config field - Use `improverModel` instead

### Technical Details

- 614+ tests passing with comprehensive coverage
- Comprehensive 8-agent security review completed
- Code quality improvements with extracted helper functions
- TypeScript strict mode with `exactOptionalPropertyTypes`

## [1.0.1] - 2026-01-19

### Fixed

- Removed redundant `hooks` field from plugin manifest that caused "Duplicate hooks file detected" error
- Plugin manifest now correctly omits the hooks field since hooks/hooks.json is auto-loaded from standard location

## [1.0.0] - 2026-01-19

### Added

- **Core Plugin Architecture**
  - UserPromptSubmit hook for automatic prompt improvement
  - Configuration system with sensible defaults
  - Comprehensive error handling with graceful fallbacks
  - JSON logging for debugging and monitoring

- **Classification Engine**
  - Three-tier classification: NONE, SIMPLE, COMPLEX
  - Cost-optimised model selection (Haiku vs Sonnet)
  - Classification prompt with reasoning output

- **Improvement Strategies**
  - Simple improvements using Haiku for minor clarity fixes
  - Complex improvements using Sonnet for significant restructuring
  - Intent and tone preservation
  - XML tag structuring for complex prompts

- **Smart Bypass Mechanisms**
  - Short prompt detection (≤10 tokens)
  - #skip tag support with tag removal
  - Low context detection (<5% available)
  - Forked session detection (recursion prevention)
  - Plugin disabled configuration

- **Context Detection**
  - Tool detector for available capabilities
  - Skill matcher with keyword matching
  - Agent suggester with description matching
  - Context builder with multi-source aggregation

- **Git Integration**
  - Branch name detection
  - Recent commits retrieval
  - Changed files parsing
  - Graceful fallback for non-git directories

- **LSP Integration**
  - Diagnostics retrieval via MCP
  - Error and warning filtering
  - Relevance matching to prompt keywords

- **Specification Awareness**
  - .specify/ directory detection
  - spec.md frontmatter and user story parsing
  - plan.md phase extraction
  - tasks.md status tracking

- **Memory Plugin Integration**
  - Plugin installation detection
  - index.json parsing
  - Memory matching by title and tags
  - Top 5 relevant memories selection

- **Session Context**
  - Compaction detection with context usage parsing
  - Session forking with timeout management
  - Forked session detection via permission_mode

### Technical Details

- Built with Bun runtime for fast execution
- TypeScript with strict mode enabled
- 436+ tests with comprehensive coverage
- TDD methodology throughout development
- Modular architecture for extensibility

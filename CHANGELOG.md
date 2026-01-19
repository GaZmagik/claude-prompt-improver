# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

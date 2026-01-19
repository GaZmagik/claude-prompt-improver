# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

---
id: decision-dynamic-context-injection-v130-spec
title: Dynamic Context Injection v1.3.0 Specification
type: decision
scope: project
created: "2026-01-21T20:26:20.538Z"
updated: "2026-01-21T20:26:20.538Z"
tags:
  - ready-for-planning
  - dynamic-discovery
  - filesystem-scanning
  - integration
  - project
---

Created formal specification for dynamic context injection feature replacing hardcoded agent/skill/command suggestions with filesystem scanning.

**Key Requirements:**
- FR-001 to FR-018: Scan ~/.claude/ and .claude/ directories for agents, commands, skills, output styles
- Parse markdown frontmatter using existing parseFrontmatter() from spec-awareness.ts
- Match resources to prompts via matchItemsByKeywords() from keyword-matcher.ts
- Special handling for memory think prompts with --agent and --style suggestions
- LRU cache with mtime-based invalidation (MAX_CACHE_SIZE=50)
- Integration via Promise.allSettled pattern in context-builder.ts
- Path validation to prevent directory traversal attacks
- Timeout enforcement: 2s per directory scan
- Cross-platform path handling (Windows, Linux, macOS)

**Success Criteria:**
- SC-001: 100% discovery accuracy for valid markdown files
- SC-002: <2s scan time per directory (95% of scans)
- SC-003: 80%+ cache hit rate within sessions
- SC-008: 100% path traversal rejection
- SC-011: Cross-platform compatibility verified

**User Stories (Prioritised):**
- US1: Agent Discovery (P1) - MVP foundation
- US2: Multi-Source Discovery (P1) - Extends to commands/skills/styles
- US3: Memory Think Special Case (P2) - Enhanced suggestions
- US4: Integration Pattern Compliance (P1) - Architectural alignment
- US5: Performance (P2) - Caching and optimisation

**Open Questions for Planning:**
- OQ-001: Should MAX_CACHE_SIZE be configurable?
- OQ-002: How to handle skills directory structure?
- OQ-003: Collection-level vs file-level caching?
- OQ-007: Local override vs dual availability?

**Status:** Specification validated and approved for planning phase
**Location:** .specify/specs/feature/002-dynamic-context-injection/spec.md
**Checklist:** All quality checks passed
**Next Step:** /speckit:plan for technical design

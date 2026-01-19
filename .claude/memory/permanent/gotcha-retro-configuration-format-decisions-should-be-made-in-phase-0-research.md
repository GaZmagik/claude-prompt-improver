---
id: gotcha-retro-configuration-format-decisions-should-be-made-in-phase-0-research
title: Retro - Configuration format decisions should be made in Phase 0 research
type: gotcha
scope: project
created: "2026-01-19T08:44:11.095Z"
updated: "2026-01-19T08:44:11.095Z"
tags:
  - retrospective
  - process
  - planning
  - architecture
  - project
severity: medium
---

Changed config format from JSON to markdown mid-implementation (Phase 10). This required rewriting config-loader.ts tests and implementation, causing rework. The decision (markdown with YAML frontmatter like claude-memory-plugin) was sound but timing was wrong. Pattern: Major architectural decisions (not implementation details) should be validated during Phase 0 research before writing specs. Mitigation: Review architectural decisions during planning phase before Phase 1.

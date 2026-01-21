---
id: learning-retro-codebase-exploration-agent-is-essential-before-specking-new-features
title: Retro - Codebase exploration agent is essential before specking new features
type: learning
scope: project
created: "2026-01-21T20:47:24.494Z"
updated: "2026-01-21T20:47:24.494Z"
tags:
  - retrospective
  - process
  - exploration
  - architecture-reuse
  - project
severity: high
---

Before /speckit:explore, ran codebase exploration agent to find existing patterns (context-builder.ts, spec-awareness.ts, etc.). This prevented reinventing the wheel and informed all subsequent design decisions. Example: discovered existing skill-matcher.ts and agent-suggester.ts already 80% solved the problem, just needed to be wired. Pattern: Always run Explore agent BEFORE specification phase to surface reusable patterns and architectural conventions. Saves hours of planning time.

---
id: learning-retro-pre-identify-all-code-locations-before-refactoring-to-avoid-incremental-discovery
title: Retro - Pre-identify all code locations before refactoring to avoid incremental discovery
type: learning
scope: project
created: "2026-01-19T23:06:09.456Z"
updated: "2026-01-19T23:06:09.456Z"
tags:
  - retrospective
  - process
  - refactoring
  - project
severity: low
---

During git-context.ts refactoring (executeGitCommand signature change), discovered call sites incrementally through TypeScript errors rather than upfront. Better approach: grep for all callers first, then execute all changes together. This prevents the cycle of: change → compile → find next error → change again. Cost: ~10 mins of iteration that could have been one batch.

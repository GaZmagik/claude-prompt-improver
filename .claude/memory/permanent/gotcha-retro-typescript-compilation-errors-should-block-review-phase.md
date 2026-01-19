---
id: gotcha-retro-typescript-compilation-errors-should-block-review-phase
title: Retro - TypeScript compilation errors should block review phase
type: gotcha
scope: project
created: "2026-01-19T10:04:44.090Z"
updated: "2026-01-19T10:04:44.090Z"
tags:
  - retrospective
  - process
  - typescript
  - quality
  - ci
  - project
severity: high
---

Comprehensive code review was executed with 7 expert agents while codebase had 55+ TypeScript compilation errors (TS2532, TS6133) due to strictOptionalPropertyTypes and noUncheckedIndexedAccess. Review findings are misleading when code doesn't compile. Pattern: Run `npx tsc --noEmit` as pre-review gate. Errors: unsafe optional access in test arrays (need `!` after length check), unused imports (TS6133), regex match null checks. This should be caught by CI before feature merges.

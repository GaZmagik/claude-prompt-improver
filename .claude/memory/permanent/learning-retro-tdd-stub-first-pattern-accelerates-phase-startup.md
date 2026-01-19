---
id: learning-retro-tdd-stub-first-pattern-accelerates-phase-startup
title: Retro - TDD stub-first pattern accelerates phase startup
type: learning
scope: project
created: "2026-01-19T01:10:36.069Z"
updated: "2026-01-19T01:10:36.069Z"
tags:
  - retrospective
  - process
  - tdd
  - project
severity: medium
---

Creating empty .ts and .spec.ts stub files BEFORE writing tests unlocks TDD enforcement hooks and allows focused test-writing. Prevents compilation blockers that interrupt flow. Recommend for all TDD phases: touch stubs → write tests (red) → implement (green) → cleanup.

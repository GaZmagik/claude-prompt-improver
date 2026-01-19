---
id: learning-retro-tdd-fixture-discovery-gaps-show-need-for-earlier-type-validation
title: Retro - TDD fixture discovery gaps show need for earlier type validation
type: learning
scope: project
created: "2026-01-19T15:34:22.846Z"
updated: "2026-01-19T15:34:22.846Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: medium
---

During Visibility MVP Phase 2, LogEntryInput gained new required fields (level, phase) that only became visible during fixture updates in Phase 2.7. This created 25 TypeScript errors. Root cause: Phase 1 test writing didn't validate type completeness before Phase 2 implementation began. Lesson: At end of Phase 1 (RED state), run 'npx tsc --noEmit' to catch type-level gaps in test fixtures before implementation. This shifts fixture-update work from mechanical Phase 2.7 phase into Phase 1 where it prevents implementation errors.

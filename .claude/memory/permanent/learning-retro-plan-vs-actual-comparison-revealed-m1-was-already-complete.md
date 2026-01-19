---
id: learning-retro-plan-vs-actual-comparison-revealed-m1-was-already-complete
title: Retro - Plan vs actual comparison revealed M1 was already complete
type: learning
scope: project
created: "2026-01-19T19:27:47.991Z"
updated: "2026-01-19T19:27:47.991Z"
tags:
  - retrospective
  - process
  - planning
  - code-review
  - project
severity: low
---

During final plan review before PR creation, discovered M1 (keyword matcher extraction) was actually already implemented in commit 9516368, not 'not done' as initially assessed. Memory-plugin.ts intentionally does NOT use the shared utility due to documented architectural differences (bidirectional tag matching, weighted scoring, type-based boosting). This design decision was correct. Lesson: When marking items 'deferred', verify the implementation doesn't already exist with documented reasoning.

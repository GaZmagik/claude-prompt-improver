---
id: learning-retro-integration-point-test-coverage-66-73-should-be-prioritised-before-expanding-features
title: Retro - Integration point test coverage (66-73%) should be prioritised before expanding features
type: learning
scope: project
created: "2026-01-19T08:44:17.497Z"
updated: "2026-01-19T08:44:17.497Z"
tags:
  - retrospective
  - process
  - testing
  - coverage
  - project
severity: medium
---

Final coverage: 96.66% function, 89.26% line. Significant gaps remain in integration points: context-builder (66.89%), classifier (72.86%), claude-client (67.14%), improver (70.18%). These files coordinate between services and are highest-risk for bugs. Lesson: In future implementations, prioritise integration point coverage before adding new modules. Strategy: After Phase 4 (context detection complete), run coverage and ensure all integration points >90% before proceeding to advanced integrations (Phases 5-9). This prevents cascading test-coverage debt.

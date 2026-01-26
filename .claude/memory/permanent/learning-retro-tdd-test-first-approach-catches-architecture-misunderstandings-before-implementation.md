---
id: learning-retro-tdd-test-first-approach-catches-architecture-misunderstandings-before-implementation
title: Retro - TDD test-first approach catches architecture misunderstandings before implementation
type: learning
scope: project
created: "2026-01-24T19:02:14.527Z"
updated: "2026-01-24T19:02:14.527Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: high
---

Writing tests before code (T200-T216, 40 new tests) meant when user corrected path behaviour ('custom paths supplement defaults, not replace'), tests already captured the requirement. Refactoring the implementation was a matter of updating 6 lines of logic and test assertions. Without TDD, this would have been post-implementation discovery. Pattern: (1) Write unit tests for spec, (2) Write integration tests for orchestration, (3) Implement to pass tests, (4) Review catches policy issues (not architecture), (5) Refactor with confidence.

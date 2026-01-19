---
id: learning-tdd-fixture-discovery-test-first-approach-revealed-schema-gaps-early
title: "TDD fixture discovery: Test-first approach revealed schema gaps early"
type: learning
scope: project
created: "2026-01-19T15:35:15.317Z"
updated: "2026-01-19T15:35:15.317Z"
tags:
  - tdd
  - testing
  - fixture-discovery
  - visibility-mvp
  - project
---

Writing tests first for new LogEntry fields (level, phase, promptPreview) immediately revealed missing type validation and security requirements. This prevented shipping incomplete code and caught edge cases (invalid log levels) before implementation.

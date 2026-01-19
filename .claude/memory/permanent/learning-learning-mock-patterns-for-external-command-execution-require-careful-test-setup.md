---
id: learning-learning-mock-patterns-for-external-command-execution-require-careful-test-setup
title: Learning - Mock patterns for external command execution require careful test setup
type: learning
scope: project
created: "2026-01-19T07:39:15.860Z"
updated: "2026-01-19T07:39:15.860Z"
tags:
  - retrospective
  - process
  - testing
  - mocks
  - project
severity: medium
---

Phase 5 git integration used `_mockCommandResults` pattern for testing. Required explicit command string matching ('branch --show-current', 'log --oneline -5', etc). One test failure caught off-by-one slicing error in parseGitStatus. Lesson: mock external commands at abstraction layer, not string level. Consider: (1) structured mock input types, (2) dependency injection for spawning, (3) isolation of parsing logic from execution.

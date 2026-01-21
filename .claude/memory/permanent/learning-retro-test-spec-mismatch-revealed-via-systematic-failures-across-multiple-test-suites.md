---
id: learning-retro-test-spec-mismatch-revealed-via-systematic-failures-across-multiple-test-suites
title: Retro - Test-spec mismatch revealed via systematic failures across multiple test suites
type: learning
scope: project
created: "2026-01-21T13:52:31.785Z"
updated: "2026-01-21T13:52:31.785Z"
tags:
  - retrospective
  - testing
  - patterns
  - project
severity: medium
---

When fixing 12 failing tests across 3 test files (improve-prompt.spec, full-flow.spec, readme.spec), discovered that test structure assumed old nested `context` format while actual Claude Code sends flat structure with `session_id` at root level. Pattern: systematic test failures across unrelated files often indicate a shared assumption/interface mismatch worth investigating holistically rather than case-by-case. Coordinated fix across all test files was more efficient than isolated fixes.

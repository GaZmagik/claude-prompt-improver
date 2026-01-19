---
id: learning-retro-regex-based-pattern-detection-benefits-from-test-first-specification
title: Retro - Regex-based pattern detection benefits from test-first specification
type: learning
scope: project
created: "2026-01-19T15:34:28.425Z"
updated: "2026-01-19T15:34:28.425Z"
tags:
  - retrospective
  - process
  - testing
  - pattern-matching
  - project
severity: low
---

In generateImprovementSummary(), context-injection detection initially used /<(git_context|lsp_diagnostics|...)>/ but missed generic <context> tags. Test failure revealed: 'should detect context injection' expected generic tags. Root cause: Regex pattern not validated against test cases during Phase 1 RED state. Lesson: For pattern-matching functions, Phase 1 test cases should enumerate all expected match patterns (even if implementation doesn't support them yet). This forces explicit specification of behavior boundaries and catches design gaps before implementation.

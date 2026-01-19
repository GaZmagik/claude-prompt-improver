---
id: learning-integration-tests-must-validate-interface-signatures-before-writing-assertions
title: Integration tests must validate interface signatures before writing assertions
type: learning
scope: project
created: "2026-01-19T18:16:00.480Z"
updated: "2026-01-19T18:16:00.480Z"
tags:
  - testing
  - integration-tests
  - typescript
  - tdd
  - project
---

When writing integration tests that call real implementations, read the actual function signatures and types first. Discovered in full-flow.spec.ts: type mismatches between test assertions and actual function parameters required iterative fixes. Read implementation before test to prevent assertion rewrites.

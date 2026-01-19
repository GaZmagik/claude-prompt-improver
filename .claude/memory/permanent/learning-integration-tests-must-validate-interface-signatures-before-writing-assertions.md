---
id: learning-integration-tests-must-validate-interface-signatures-before-writing-assertions
title: Integration tests must validate interface signatures before writing assertions
type: learning
scope: project
created: "2026-01-19T18:53:34.982Z"
updated: "2026-01-19T18:53:34.982Z"
tags:
  - tdd
  - integration-tests
  - testing
  - project
---

When writing integration tests, validate that the interface signatures match before writing assertions. This prevents test failures due to mismatched function signatures rather than actual logic errors. Discovered during M3 phase when test file was created with stub but assertions weren't written against actual interfaces.

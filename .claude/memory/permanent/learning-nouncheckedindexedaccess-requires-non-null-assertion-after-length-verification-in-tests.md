---
id: learning-nouncheckedindexedaccess-requires-non-null-assertion-after-length-verification-in-tests
title: noUncheckedIndexedAccess requires non-null assertion after length verification in tests
type: learning
scope: project
created: "2026-01-19T10:04:52.001Z"
updated: "2026-01-19T10:04:52.001Z"
tags:
  - typescript
  - testing
  - strictness
  - project
---

In test files with noUncheckedIndexedAccess, after checking array.length > 0, use array[0]! to safely access elements. This is acceptable in tests where you control test data. Fixes TS2532 errors in git-context.spec.ts and lsp-diagnostics.spec.ts.

---
id: learning-retro-non-null-assertions-in-tests-after-length-checks-work-well-for-strictoptionalpropertytypes
title: Retro - Non-null assertions in tests after length checks work well for strictOptionalPropertyTypes
type: learning
scope: project
created: "2026-01-19T10:04:53.180Z"
updated: "2026-01-19T10:04:53.180Z"
tags:
  - retrospective
  - process
  - typescript
  - testing
  - pattern
  - project
severity: low
---

Fixed 35+ TypeScript errors by using non-null assertions (`array[i]!`) after verifying length or existence checks. Pattern: `expect(array.length).toBe(N); expect(array[0]!.property)`. This satisfies noUncheckedIndexedAccess without verbose guard clauses or type casts. More readable than exhaustive if-checks or type assertions. Works because assertion truthiness is enforced by the preceding length check. Recommendation: document this pattern in TypeScript style guide for test files.

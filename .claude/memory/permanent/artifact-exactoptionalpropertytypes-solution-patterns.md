---
id: artifact-exactoptionalpropertytypes-solution-patterns
title: exactOptionalPropertyTypes Solutions Comparison
type: artifact
scope: project
created: "2026-01-19T10:09:25.155Z"
updated: "2026-01-19T10:09:25.155Z"
tags:
  - typescript
  - patterns
  - comparison
  - project
---

PATTERN 1 - Omission (simplest): Just don't include properties, const obj = { field1: val1 } (omit optional fields entirely)

PATTERN 2 - Spread Operator (recommended): const obj = { ...base, ...(optional && { optionalProp: value }) }

PATTERN 3 - Casting (explicit): if (value !== undefined) { (obj as { field?: T }).field = value; }

Recommendation: Use Pattern 2 (spread) for tests, Pattern 1 (omission) for runtime code, Pattern 3 (casting) only when dynamic property setting is required.

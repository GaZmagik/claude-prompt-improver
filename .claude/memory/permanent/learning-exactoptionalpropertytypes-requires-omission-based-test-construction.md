---
id: learning-exactoptionalpropertytypes-requires-omission-based-test-construction
title: exactOptionalPropertyTypes requires omission-based test construction
type: learning
scope: project
created: "2026-01-19T07:39:48.184Z"
updated: "2026-01-19T07:39:48.184Z"
tags:
  - typescript
  - testing
  - pattern
  - strictmode
  - prompt-improver
  - project
---

TypeScript strictMode with exactOptionalPropertyTypes forbids explicit undefined in optional properties. Resolution: omit properties entirely instead of setting undefined. Pattern: spread objects with conditional properties rather than explicit { prop: undefined }. This improves readability whilst maintaining type safety.

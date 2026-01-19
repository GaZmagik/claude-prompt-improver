---
id: learning-exactoptionalpropertytypes-requires-null-guards-on-regex-matches
title: exactOptionalPropertyTypes requires null-guards on regex matches
type: learning
scope: project
created: "2026-01-19T10:04:51.482Z"
updated: "2026-01-19T10:04:51.482Z"
tags:
  - typescript
  - strictness
  - regex
  - pattern
  - project
---

With exactOptionalPropertyTypes enabled, regex.exec() results must be null-checked before accessing captured groups. Pattern: const match = regex.exec(str); if (!match) return; const value = match[1]!; This fixes TypeScript TS2532 errors in spec-awareness.ts.

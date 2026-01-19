---
id: gotcha-gotcha-exactoptionalpropertytypes-requires-conditional-property-inclusion-pattern
title: Gotcha - exactOptionalPropertyTypes requires conditional property inclusion pattern
type: gotcha
scope: project
created: "2026-01-19T07:39:08.772Z"
updated: "2026-01-19T07:39:08.772Z"
tags:
  - retrospective
  - typescript
  - gotcha
  - strictness
  - project
severity: high
---

TypeScript strictness flag exactOptionalPropertyTypes rejects explicit undefined assignments (e.g., `field: undefined`). Workaround: conditionally include properties only when defined using casting pattern: `if (value !== undefined) { (obj as { field?: T }).field = value; }`. This pattern appeared 10+ times across codebase. Future: document this pattern early or use discriminated unions to avoid repetition.

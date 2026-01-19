---
id: gotcha-retro-exactoptionalpropertytypes-friction-in-object-building-patterns
title: Retro - exactOptionalPropertyTypes friction in object building patterns
type: gotcha
scope: project
created: "2026-01-19T01:10:44.984Z"
updated: "2026-01-19T01:10:44.984Z"
tags:
  - retrospective
  - process
  - typescript
  - strictness
  - project
severity: medium
---

TypeScript's exactOptionalPropertyTypes in strict mode made building objects with optional fields awkward. Solutions that worked: conditional spread operators, explicit field-by-field assignment with if-checks, forced type casting. Future work: Consider type-safe builder pattern or helper function to reduce boilerplate when constructing objects with many optional fields.

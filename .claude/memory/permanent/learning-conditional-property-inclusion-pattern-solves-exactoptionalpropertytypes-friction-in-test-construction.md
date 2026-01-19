---
id: learning-conditional-property-inclusion-pattern-solves-exactoptionalpropertytypes-friction-in-test-construction
title: Conditional property inclusion pattern solves exactOptionalPropertyTypes friction in test construction
type: learning
scope: project
created: "2026-01-19T08:13:29.623Z"
updated: "2026-01-19T08:13:29.623Z"
tags:
  - typescript
  - testing
  - exactOptionalPropertyTypes
  - patterns
  - project
---

Instead of assigning undefined to optional properties, conditionally include them in object literals. Pattern: const obj = { ...base, ...(optional && { optionalProp: value }) }. Reduces test boilerplate significantly in strict TypeScript mode.

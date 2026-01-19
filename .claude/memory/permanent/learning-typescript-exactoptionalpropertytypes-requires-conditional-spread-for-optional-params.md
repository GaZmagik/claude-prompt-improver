---
id: learning-typescript-exactoptionalpropertytypes-requires-conditional-spread-for-optional-params
title: TypeScript exactOptionalPropertyTypes requires conditional spread for optional params
type: learning
scope: project
created: "2026-01-19T22:35:09.944Z"
updated: "2026-01-19T22:35:09.944Z"
tags:
  - typescript
  - testing
  - type-safety
  - project
---

The strictest TypeScript config (exactOptionalPropertyTypes: true) prevents explicit undefined values on optional properties. Solution: use conditional spread pattern to only include properties when defined. Fixed 7 errors in full-flow.spec.ts using this approach.

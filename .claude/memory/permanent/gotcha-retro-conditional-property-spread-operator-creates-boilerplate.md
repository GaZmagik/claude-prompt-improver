---
id: gotcha-retro-conditional-property-spread-operator-creates-boilerplate
title: Retro - Conditional property spread operator creates boilerplate
type: gotcha
scope: project
created: "2026-01-19T14:30:41.419Z"
updated: "2026-01-19T14:30:41.419Z"
tags:
  - retrospective
  - code-quality
  - typescript
  - project
severity: low
---

Used spread operator pattern extensively for conditional properties: `...(field !== undefined && { key: field })`. Works but verbose. Future improvement: Extract helper `conditionalProperty(field, key)` to reduce boilerplate across codebase. Example: Instead of 15+ spread patterns in logger.ts, could use: `{ ...conditionalProperty(latency, 'classificationLatency'), ... }`

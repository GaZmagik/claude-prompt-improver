---
id: learning-exactoptionalpropertytypes-requires-conditional-object-spreads
title: exactOptionalPropertyTypes Requires Conditional Object Spreads
type: learning
scope: project
created: "2026-01-21T21:19:46.731Z"
updated: "2026-01-21T21:19:46.731Z"
tags:
  - typescript
  - exactOptionalPropertyTypes
  - gotcha
  - project
---

When using exactOptionalPropertyTypes: true in tsconfig, don't include optional properties with undefined values. Use conditional spreads like ...( foo ? {foo} : {}) instead of {foo: undefined}.

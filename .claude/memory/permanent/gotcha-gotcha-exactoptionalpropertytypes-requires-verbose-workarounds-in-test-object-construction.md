---
id: gotcha-gotcha-exactoptionalpropertytypes-requires-verbose-workarounds-in-test-object-construction
title: Gotcha - exactOptionalPropertyTypes requires verbose workarounds in test object construction
type: gotcha
scope: project
created: "2026-01-19T04:41:51.708Z"
updated: "2026-01-19T04:41:51.708Z"
tags:
  - retrospective
  - typescript
  - strictness
  - project
severity: medium
---

TypeScript strict mode with exactOptionalPropertyTypes:true rejects optional fields unless explicitly set. Workarounds: (1) spread object only with defined fields, (2) cast through `unknown as Type`, (3) use type assertion factories. In Phase 4, had to refactor multiple test inputs. Better approach: Create helper function for building partial objects that respects exactOptionalPropertyTypes.

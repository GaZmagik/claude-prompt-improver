---
id: learning-retro-type-casting-repetition-indicates-abstraction-gap
title: Retro - Type casting repetition indicates abstraction gap
type: learning
scope: project
created: "2026-01-24T19:02:18.979Z"
updated: "2026-01-24T19:02:18.979Z"
tags:
  - retrospective
  - process
  - refactoring
  - types
  - project
severity: medium
---

The repeated `(contextInput as { field?: Type })` pattern appeared 7 times in buildImprovementContext. This was a smell that we should use the proper ContextBuilderInput type from context-builder.ts. Extracting buildIntegrationOptions() and using conditional spreads revealed cleaner architecture and reduced function from 115 to 35 lines. Pattern: When casting the same value 3+ times, you're missing a type abstraction. Extract it.

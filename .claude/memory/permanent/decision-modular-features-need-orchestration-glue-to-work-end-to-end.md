---
id: decision-modular-features-need-orchestration-glue-to-work-end-to-end
title: Modular features need orchestration glue to work end-to-end
type: decision
scope: project
created: "2026-01-24T13:50:45.142Z"
updated: "2026-01-24T13:50:45.142Z"
tags:
  - integration-testing
  - modular-architecture
  - wiring-gap
  - feature-development
  - project
---

Implementing a feature in isolation (pluginResources in context-builder.ts) doesn't make it usable. The orchestration layer (improve-prompt.ts) must explicitly wire the new module into the request/response flow. Missing wiring means the feature silently doesn't execute—test coverage must validate end-to-end integration, not just module unit tests.

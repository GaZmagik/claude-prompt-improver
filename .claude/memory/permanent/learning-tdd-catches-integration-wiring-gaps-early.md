---
id: learning-tdd-catches-integration-wiring-gaps-early
title: TDD catches integration wiring gaps early
type: learning
scope: project
created: "2026-01-24T19:02:04.225Z"
updated: "2026-01-24T19:02:04.225Z"
tags:
  - tdd
  - integration
  - testing
  - project
---

v1.6.0 implemented pluginResources gathering in context-builder.ts but never wired it through improve-prompt.ts. TDD approach (write tests first) would have caught this immediately. Tests forced discovery of the unused feature during Phase 2, preventing production bugs.

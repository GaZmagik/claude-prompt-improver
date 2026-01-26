---
id: learning-retro-memory-activation-at-session-start-surfaces-architectural-gaps
title: Retro - Memory activation at session start surfaces architectural gaps
type: learning
scope: project
created: "2026-01-24T19:02:09.968Z"
updated: "2026-01-24T19:02:09.968Z"
tags:
  - retrospective
  - process
  - memory-skill
  - architecture
  - project
severity: high
---

Activating /memory skill at session start (before implementation) surfaced the v1.6.0 pluginResources wiring gap and integration test parity gotcha. This single action prevented shipping a stubbed feature and informed the entire v1.7.0 approach. Explicit pattern: (1) Start with /memory, (2) Read high-relevance gotchas, (3) Add memory checks to todo list first item. This is more effective than discovering issues post-implementation.

---
id: gotcha-retro-conflicting-architectural-decisions-led-to-wasted-implementation
title: Retro - Conflicting architectural decisions led to wasted implementation
type: gotcha
scope: project
created: "2026-01-21T13:31:39.024Z"
updated: "2026-01-21T13:31:39.024Z"
tags:
  - retrospective
  - process
  - architecture
  - sync
  - project
severity: high
---

Original spec (research.md Decision 1) chose classification for NONE/SIMPLE/COMPLEX prompts. Later decision removed it for performance (2 API calls = 4-9s latency). This created cognitive dissonance: spec said YES, code said NO, tests all passed anyway. Root cause: specification and implementation decisions not synchronized. Lesson: When overriding architectural decisions, explicitly update the spec document and add gotcha/decision memory immediately to prevent future confusion.

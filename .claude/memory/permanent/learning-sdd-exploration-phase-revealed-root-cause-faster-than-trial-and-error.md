---
id: learning-sdd-exploration-phase-revealed-root-cause-faster-than-trial-and-error
title: SDD exploration phase revealed root cause faster than trial-and-error
type: learning
scope: project
created: "2026-01-22T19:56:11.178Z"
updated: "2026-01-22T19:56:11.178Z"
tags:
  - speckit
  - sdd
  - investigation
  - architecture
  - debugging
  - project
---

Running /speckit:explore to understand architecture and existing patterns before implementing fixes revealed multiple missing wiring points systematically. Investigation found: parseHookInput() doesn't extract available_tools, main() doesn't pass them through, dynamicDiscovery isn't invoked. Without exploration, would have fixed each symptom individually.

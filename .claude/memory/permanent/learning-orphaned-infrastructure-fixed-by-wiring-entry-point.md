---
id: learning-orphaned-infrastructure-fixed-by-wiring-entry-point
title: Orphaned infrastructure fixed by wiring entry point
type: learning
scope: project
created: "2026-01-22T19:56:05.885Z"
updated: "2026-01-22T19:56:05.885Z"
tags:
  - architecture
  - orchestration
  - integration
  - refactoring
  - project
---

Dynamic discovery infrastructure was complete, tested, and functional but never invoked because main() orchestration layer didn't wire it up. Pattern: complete subsystems can exist unused if entry point doesn't connect them. Discovered by investigation: parseHookInput() similarly wasn't extracting available_tools field despite infrastructure existing.

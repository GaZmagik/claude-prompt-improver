---
id: learning-retro-exploration-phase-dramatically-clarifies-fix-scope
title: Retro - Exploration phase dramatically clarifies fix scope
type: learning
scope: project
created: "2026-01-22T19:55:27.964Z"
updated: "2026-01-22T19:55:27.964Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

Running the Explore agent before implementing fixes was crucial. It surfaced the exact root cause (available_tools from stdin was never extracted, dynamicDiscovery infrastructure existed but was orphaned). Led to minimal, focused changes with zero rework. For architecture-level bugs, exploration beats speculation every time.

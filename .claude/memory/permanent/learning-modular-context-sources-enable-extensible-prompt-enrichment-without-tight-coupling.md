---
id: learning-modular-context-sources-enable-extensible-prompt-enrichment-without-tight-coupling
title: Modular context sources enable extensible prompt enrichment without tight coupling
type: learning
scope: project
created: "2026-01-19T08:13:10.515Z"
updated: "2026-01-19T08:13:10.515Z"
tags:
  - architecture
  - extensibility
  - separation-of-concerns
  - context-sources
  - project
---

Each context source (tools, skills, agents, git, lsp, spec, memory) is independently optional and can be gathered/formatted separately. Added 7 sources across phases without modifying core context-builder logic - only adding new interface implementations.

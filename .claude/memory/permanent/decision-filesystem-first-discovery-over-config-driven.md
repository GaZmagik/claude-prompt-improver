---
id: decision-filesystem-first-discovery-over-config-driven
title: Filesystem-first discovery over config-driven
type: decision
scope: project
created: "2026-01-21T20:47:31.753Z"
updated: "2026-01-21T20:47:31.753Z"
tags:
  - architecture
  - discovery
  - configuration
  - project
---

Adopt runtime filesystem scanning over config-driven approach. Scans ~/.claude/ and .claude/ directories to discover agents, skills, commands, and output-styles dynamically, eliminating need for manual skill-rules.json maintenance.

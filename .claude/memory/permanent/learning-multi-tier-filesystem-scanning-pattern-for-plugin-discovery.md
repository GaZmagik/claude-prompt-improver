---
id: learning-multi-tier-filesystem-scanning-pattern-for-plugin-discovery
title: Multi-tier filesystem scanning pattern for plugin discovery
type: learning
scope: project
created: "2026-01-21T20:47:38.093Z"
updated: "2026-01-21T20:47:38.093Z"
tags:
  - architecture
  - pattern
  - discovery
  - filesystem
  - project
---

Implemented two-tier scanning: ~/.claude/ (user-global) and .claude/ (project-local) directories. Consistent YAML frontmatter parsing across agents, skills, commands, output-styles enables unified discovery logic. Skills stored as directories; other types as markdown files.

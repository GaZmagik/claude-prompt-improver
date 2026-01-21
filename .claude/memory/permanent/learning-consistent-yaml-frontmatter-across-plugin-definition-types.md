---
id: learning-consistent-yaml-frontmatter-across-plugin-definition-types
title: Consistent YAML frontmatter across plugin definition types
type: learning
scope: project
created: "2026-01-21T20:47:54.185Z"
updated: "2026-01-21T20:47:54.185Z"
tags:
  - architecture
  - consistency
  - design-pattern
  - project
---

All definition types (agents, commands, output-styles) use markdown with YAML frontmatter containing name/description. Skills stored as directories. This consistency simplifies discovery logic and enables unified parsing using existing parseFrontmatter() utility.

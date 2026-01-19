---
id: learning-retro-config-format-redesign-required-parallel-file-management
title: Retro - Config format redesign required parallel file management
type: learning
scope: project
created: "2026-01-19T09:39:48.937Z"
updated: "2026-01-19T09:39:48.937Z"
tags:
  - retrospective
  - process
  - config
  - project
severity: medium
---

Moving config files between directories (project root → .claude/) required careful coordination with .gitignore patterns and test expectations. The initial file creation in wrong location, then move, then copy for .local.md template added friction. Future config redesigns should establish correct locations before implementation.

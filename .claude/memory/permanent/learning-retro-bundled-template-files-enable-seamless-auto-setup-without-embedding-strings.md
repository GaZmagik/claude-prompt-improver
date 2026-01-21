---
id: learning-retro-bundled-template-files-enable-seamless-auto-setup-without-embedding-strings
title: Retro - Bundled template files enable seamless auto-setup without embedding strings
type: learning
scope: project
created: "2026-01-21T13:52:41.429Z"
updated: "2026-01-21T13:52:41.429Z"
tags:
  - retrospective
  - configuration
  - pattern
  - project
severity: low
---

Added auto-setup feature that creates example.md from bundled template (hooks/templates/prompt-improver.example.md) rather than embedding long template strings in code. Used import.meta.dir to resolve template path relative to module location. Cleaner approach: keeps templates as separate files, easier to maintain/update, avoids string bloat in code.

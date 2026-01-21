---
id: gotcha-retro-memory-file-conflicts-graphjson-indexjson-should-be-auto-resolved-or-gitignored
title: Retro - Memory file conflicts (graph.json, index.json) should be auto-resolved or gitignored
type: gotcha
scope: project
created: "2026-01-21T22:34:41.974Z"
updated: "2026-01-21T22:34:41.974Z"
tags:
  - retrospective
  - process
  - git
  - project
severity: medium
---

When hooks run parallel memory updates before compaction, concurrent writes to graph.json and index.json can create merge conflicts that require manual resolution. These metadata files shouldn't require user intervention - either: (1) Add to .gitignore and regenerate on startup, (2) Use git merge driver to auto-resolve with 'ours' strategy, or (3) Have pre-commit hook validate no conflicts. The conflict in PR #14 was expected but avoidable with proper setup.

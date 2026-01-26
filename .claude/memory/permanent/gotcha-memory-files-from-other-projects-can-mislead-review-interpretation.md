---
id: gotcha-memory-files-from-other-projects-can-mislead-review-interpretation
title: Memory files from other projects can mislead review interpretation
type: gotcha
scope: project
created: "2026-01-24T19:02:14.371Z"
updated: "2026-01-24T19:02:14.371Z"
tags:
  - review
  - integration
  - memory
  - project
---

Claude review bot flagged output-styles discovery location based on memory file from claude-memory-plugin (unrelated project) documenting a different bug. The current implementation was correct—bot misinterpreted cross-project context. Always verify that review suggestions apply to current codebase, not adjacent projects.

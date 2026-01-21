---
id: learning-context-sources-hardcoded-to-empty-array-in-hook-output
title: Context sources hardcoded to empty array in hook output
type: learning
scope: project
created: "2026-01-21T19:21:31.088Z"
updated: "2026-01-21T19:21:31.088Z"
tags:
  - context-integration
  - prop-drilling
  - bug-fix
  - project
---

ProcessPromptResult was returning contextSources:[] hardcoded instead of propagating actual sources from improvement result. Fixed by adding contextSources field to return type and passing through gathered context (git, memory, etc).

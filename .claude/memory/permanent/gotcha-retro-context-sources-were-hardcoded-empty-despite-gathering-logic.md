---
id: gotcha-retro-context-sources-were-hardcoded-empty-despite-gathering-logic
title: Retro - Context sources were hardcoded empty despite gathering logic
type: gotcha
scope: project
created: "2026-01-21T19:21:28.710Z"
updated: "2026-01-21T19:21:28.710Z"
tags:
  - retrospective
  - process
  - data-flow
  - project
severity: high
---

Integration options (git, lsp, spec, memory, session) were enabled in config and gathering logic existed, but results were never propagated to logs or output. ProcessPromptResult type didn't include contextSources field, so they were dropped at the boundary between improvePrompt() and main hook. Fixed by adding contextSources to type and passing it through. Users need visibility into what context was injected.

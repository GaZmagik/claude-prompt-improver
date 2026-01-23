---
id: gotcha-forked-session-context-bleed-without-explicit-framing
title: forked-session-context-bleed-without-explicit-framing
type: gotcha
scope: project
created: "2026-01-23T20:30:03.626Z"
updated: "2026-01-23T20:30:03.626Z"
tags:
  - fork-session
  - prompt-engineering
  - meta-prompting
  - project
---

When using fork-session for meta-tasks (like prompt improvement), the forked model receives entire previous conversation history before the improvement prompt. Without explicit '[FORKED SESSION]' framing and 'DO NOT continue conversation' instructions, model may respond to conversation context instead of treating meta-task as standalone. Fixed by strengthening prompt template with clear role/boundary statements.

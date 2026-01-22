---
id: gotcha-fork-session-hangs-on-large-sessions
title: Fork-session hangs on large sessions
type: gotcha
scope: project
created: "2026-01-22T01:01:08.502Z"
updated: "2026-01-22T01:01:08.502Z"
tags:
  - fork-session
  - prompt-improver
  - scaling
  - project
---

Fork-session CLI feature hangs indefinitely when session transcript exceeds a certain size. Tested with 60-second timeout during prompt improver v1.3.1 integration—process never completed. Prevents UserPromptSubmit hooks from using --resume --fork-session for conversation context access.

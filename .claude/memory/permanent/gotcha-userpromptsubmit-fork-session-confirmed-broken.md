---
id: gotcha-userpromptsubmit-fork-session-confirmed-broken
title: UserPromptSubmit hooks cannot use fork-session—confirmed broken in practice
type: gotcha
scope: project
created: "2026-01-22T01:01:24.140Z"
updated: "2026-01-22T01:01:24.140Z"
tags:
  - fork-session
  - userpromptsubmit-hooks
  - prompt-improver
  - session-context
  - project
---

Attempted to integrate fork-session into prompt improver v1.3.1 to give the improver conversation context. This directly contradicts the existing gotcha (gotcha-retro-userpromptsubmit-hooks-should-not-use-fork-session). Testing confirmed fork-session hangs indefinitely on large sessions. UserPromptSubmit hooks run during active session—cannot fork from self. Conversation context must come from external sources (Decision Point Index) not fork-session.

---
id: learning-claude-cli-debug-flag-workaround-enables-fork-session
title: claude cli --debug flag workaround enables fork-session
type: learning
scope: project
created: "2026-01-22T13:42:02.059Z"
updated: "2026-01-22T13:42:02.059Z"
tags:
  - fork-session
  - claude-cli
  - workaround
  - debugging
  - project
---

--debug flag is required as workaround for Claude CLI bug where commands hang indefinitely without it. With --debug, fork-session completes instantly. Without it, even fresh sessions (no fork) timeout. This is a CLI-level issue, not related to our code.

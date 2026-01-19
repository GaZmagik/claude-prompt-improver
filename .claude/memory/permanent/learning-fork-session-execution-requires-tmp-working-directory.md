---
id: learning-fork-session-execution-requires-tmp-working-directory
title: Fork-session execution requires /tmp working directory
type: learning
scope: project
created: "2026-01-19T01:11:07.265Z"
updated: "2026-01-19T01:11:07.265Z"
tags:
  - fork-session
  - claude-cli
  - gotcha
  - execution
  - project
---

When using claude --fork-session to execute improvement prompts, run from /tmp directory to avoid hook-related conflicts. Main session hooks can interfere with forked session execution, causing hangs or timeouts.

---
id: learning-memory-think-call-claude-requires-no-session-persistence
title: Memory think --call claude requires --no-session-persistence flag
type: learning
scope: project
created: "2026-01-22T01:01:18.666Z"
updated: "2026-01-22T01:01:18.666Z"
tags:
  - memory-plugin
  - sandbox
  - session-persistence
  - project
---

Child Claude CLI processes invoked from memory think via --call claude were failing with EROFS (read-only filesystem) when trying to write session transcripts to ~/.claude/projects/. Fix: add --no-session-persistence to child process args so transcripts aren't persisted. Confirmed working in claude-memory-plugin after fix implementation.

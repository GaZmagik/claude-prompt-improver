---
id: learning-async-file-operations-migration-pattern
title: Async File Operations Migration Pattern
type: learning
scope: project
created: "2026-01-21T18:51:19.659Z"
updated: "2026-01-21T18:51:19.659Z"
tags:
  - async
  - file-io
  - performance
  - testing
  - event-loop
  - project
---

Sync file operations (readFileSync, existsSync) block the event loop and can cause timeouts in async contexts. Create readFileAsync() wrapper that handles both real and mock filesystems asynchronously. Requires updating tests to await async functions.

---
id: learning-fork-session-requires-project-cwd-not-tmp-directory
title: fork-session requires project cwd not tmp directory
type: learning
scope: project
created: "2026-01-22T13:41:55.963Z"
updated: "2026-01-22T13:41:55.963Z"
tags:
  - fork-session
  - session-context
  - working-directory
  - project
---

Fork-session command hangs indefinitely when run from /tmp because session files are stored per-project in ~/.claude/projects/{slug}/ directory. Running from the actual project cwd (passed via hook input) allows fork-session to locate and load the session. This was the root cause of v1.3.1-v1.3.2 timeout issues.

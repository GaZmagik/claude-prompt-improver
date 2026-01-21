---
id: gotcha-userpromptsubmit-hooks-trigger-recursively-when-spawning-claude-cli
title: UserPromptSubmit hooks trigger recursively when spawning Claude CLI
type: gotcha
scope: project
created: "2026-01-21T13:31:43.003Z"
updated: "2026-01-21T13:31:43.003Z"
tags:
  - hooks
  - recursion
  - claude-cli
  - prompt-improver
  - project
---

When a UserPromptSubmit hook spawns `claude --print` to improve prompts, that spawned Claude process also triggers UserPromptSubmit hooks (global settings apply everywhere). This causes infinite recursion with exponentially nested XML escaping until timeout/memory exhausted.

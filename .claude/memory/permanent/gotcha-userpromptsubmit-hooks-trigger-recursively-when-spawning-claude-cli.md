---
id: gotcha-userpromptsubmit-hooks-trigger-recursively-when-spawning-claude-cli
title: UserPromptSubmit hooks trigger recursively when spawning claude CLI
type: gotcha
scope: project
created: "2026-01-21T13:10:22.563Z"
updated: "2026-01-21T13:10:22.563Z"
tags:
  - hooks
  - recursion
  - claude-cli
  - UserPromptSubmit
  - project
severity: critical
---

When a UserPromptSubmit hook spawns `claude --print` to process prompts, the spawned Claude CLI session also triggers UserPromptSubmit hooks (since global settings.json applies). This causes infinite recursion with exponentially escaping XML (`<` → `&lt;` → `&amp;lt;` → ...). Prevention: detect and skip prompts that match your own template signature (e.g., starts with 'You are improving a user prompt' or contains `<original_prompt>` tags).

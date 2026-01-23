---
id: gotcha-claude-code-does-not-send-contextusage-to-hooks
title: Claude Code does not send context_usage to hooks
type: gotcha
scope: project
created: "2026-01-22T19:58:51.526Z"
updated: "2026-01-22T19:58:51.526Z"
tags:
  - hooks
  - context
  - claude-code
  - bypass-detection
  - project
---

Claude Code does not include context_usage in UserPromptSubmit hook stdin JSON. The low_context bypass assumed this data would be available, but it is never provided. Workaround: Parse transcript .jsonl file to calculate context from input_tokens and cache tokens.

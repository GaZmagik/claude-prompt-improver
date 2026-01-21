---
id: learning-claude-code-userpromptsubmit-hook-input-format-is-flat-not-nested
title: Claude Code UserPromptSubmit hook input format is flat, not nested
type: learning
scope: project
created: "2026-01-21T13:02:21.530Z"
updated: "2026-01-21T13:02:21.530Z"
tags:
  - claude-code
  - hooks
  - userpromptsubmit
  - plugin-development
  - project
---

Claude Code sends UserPromptSubmit hooks with flat JSON containing session_id, cwd, permission_mode, hook_event_name, prompt. No nested 'context' object or 'message_index'. Hooks must parse flat format directly.

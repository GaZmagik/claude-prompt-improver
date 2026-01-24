---
id: learning-claude-code-hooks-dont-receive-sessionid-in-stdin
title: Claude Code hooks don't receive session_id in stdin
type: learning
scope: project
created: "2026-01-24T10:07:11.398Z"
updated: "2026-01-24T10:07:11.398Z"
tags:
  - hooks
  - session-identification
  - claude-code
  - project
---

PostToolUse and UserPromptSubmit command hooks receive empty stdin - session_id is not passed by Claude Code. The only session-identifying environment variable available to hooks is CLAUDE_CODE_SSE_PORT, which is unique per Claude Code instance.

---
id: gotcha-claude-code-does-not-share-availabletools-in-userpromptsubmit-hook-stdin
title: Claude Code does not share available_tools in UserPromptSubmit hook stdin
type: gotcha
scope: project
created: "2026-01-24T00:29:20.201Z"
updated: "2026-01-24T00:29:20.201Z"
tags:
  - hooks
  - claude-code
  - stdin
  - tools
  - limitation
  - project
---

Hook stdin contains: session_id, cwd, permission_mode, hook_event_name, prompt. No available_tools field. Built-in tools (Read, Write, Bash, etc.) and MCP server tools are invisible to hooks. Hooks can only discover user-created skills/agents in .claude/skills/ and .claude/agents/.

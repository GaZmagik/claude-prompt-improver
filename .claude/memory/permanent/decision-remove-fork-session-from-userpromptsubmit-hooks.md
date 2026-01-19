---
id: decision-remove-fork-session-from-userpromptsubmit-hooks
title: Remove fork-session from UserPromptSubmit hooks
type: decision
scope: project
created: "2026-01-19T22:08:23.594Z"
updated: "2026-01-19T22:08:23.594Z"
tags:
  - architecture
  - hooks
  - claude-cli
  - prompt-improver
  - project
---

Removed --fork-session and --resume from claude-client.ts. UserPromptSubmit hooks cannot fork from the active session they're executing in - this creates a circular dependency. Solution: Use fresh claude CLI calls without session forking since prompt improvement doesn't need conversation history.

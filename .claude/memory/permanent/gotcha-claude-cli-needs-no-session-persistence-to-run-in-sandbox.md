---
id: gotcha-claude-cli-needs-no-session-persistence-to-run-in-sandbox
title: Claude CLI needs --no-session-persistence to run in sandbox
type: gotcha
scope: project
created: "2026-01-21T13:02:23.882Z"
updated: "2026-01-21T13:02:23.882Z"
tags:
  - sandbox
  - claude-cli
  - erofs
  - hooks
  - project
---

Claude CLI writes session files to ~/.claude/projects/* by default. Sandbox has EROFS restrictions. Always add --no-session-persistence flag when executing claude CLI from hooks to bypass session persistence requirements.

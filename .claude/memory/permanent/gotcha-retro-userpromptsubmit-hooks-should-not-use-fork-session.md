---
id: gotcha-retro-userpromptsubmit-hooks-should-not-use-fork-session
title: Retro - UserPromptSubmit hooks should not use fork-session
type: gotcha
scope: project
created: "2026-01-19T22:08:22.792Z"
updated: "2026-01-19T22:08:22.792Z"
tags:
  - retrospective
  - hooks
  - architecture
  - gotcha
  - project
severity: high
---

Attempted to use --fork-session from UserPromptSubmit hook, which caused 'No conversation found' errors. Root cause: fork-session is designed for PreCompact/SessionEnd hooks (when session is stable), not UserPromptSubmit (active session). UserPromptSubmit hooks can't fork from themselves - circular dependency. For prompt analysis that doesn't need history, use fresh Claude sessions instead.

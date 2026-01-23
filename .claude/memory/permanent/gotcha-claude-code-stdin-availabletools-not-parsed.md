---
id: gotcha-claude-code-stdin-availabletools-not-parsed
title: Claude Code stdin available_tools not parsed
type: gotcha
scope: project
created: "2026-01-22T19:55:48.836Z"
updated: "2026-01-22T19:55:48.836Z"
tags:
  - hooks
  - stdin
  - context-injection
  - entry-point
  - project
---

The available_tools field from Claude Code stdin was being sent but never extracted in parseHookInput() or passed through main(). Complete subsystem was wired but entry point connection was missing.

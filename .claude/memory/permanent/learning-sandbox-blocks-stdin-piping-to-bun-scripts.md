---
id: learning-sandbox-blocks-stdin-piping-to-bun-scripts
title: Sandbox blocks stdin piping to Bun scripts
type: learning
scope: project
created: "2026-01-21T13:02:22.682Z"
updated: "2026-01-21T13:02:22.682Z"
tags:
  - sandbox
  - bun
  - testing
  - stdin
  - project
---

Bun scripts in Claude Code sandbox receive empty stdin when piped (redirected to /dev/null). Manual testing via echo | bun doesn't work. Test hooks via actual Claude Code execution or examine logs after real prompts.

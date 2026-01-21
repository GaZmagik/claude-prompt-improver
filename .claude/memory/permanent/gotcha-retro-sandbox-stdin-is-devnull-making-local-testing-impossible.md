---
id: gotcha-retro-sandbox-stdin-is-devnull-making-local-testing-impossible
title: Retro - Sandbox stdin is /dev/null, making local testing impossible
type: gotcha
scope: project
created: "2026-01-21T13:01:44.152Z"
updated: "2026-01-21T13:01:44.152Z"
tags:
  - retrospective
  - process
  - testing
  - sandbox
  - project
severity: high
---

We attempted manual testing of the hook using echo piped to bun, but discovered that within the Claude Code sandbox, stdin is redirected to /dev/null. This made all our testing appear to fail silently. However, Claude Code runs hooks outside the sandbox with real stdin. This means manual testing in the current shell won't catch hook input/output issues - must use actual Claude Code to verify hooks work.

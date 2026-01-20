---
id: gotcha-retro-validate-complex-cli-commands-before-execution
title: Retro - Validate complex CLI commands before execution
type: gotcha
scope: project
created: "2026-01-20T14:38:48.069Z"
updated: "2026-01-20T14:38:48.069Z"
tags:
  - retrospective
  - recovery
  - cli
  - validation
  - project
severity: high
---

PhotoRec command had syntax error in /cmd options that went unnoticed until investigation revealed it was running with defaults, not paranoid mode. This caused ~8 hour recovery to miss TypeScript/Rust projects, git objects, and config files. Prevention: (1) Test CLI commands with --dry-run or verbose flags first, (2) Validate command syntax against tool documentation before running, (3) For long-running operations, monitor first 5 minutes to verify it's operating as expected.

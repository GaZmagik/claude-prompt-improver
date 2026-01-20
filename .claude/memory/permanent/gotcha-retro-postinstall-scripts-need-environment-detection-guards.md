---
id: gotcha-retro-postinstall-scripts-need-environment-detection-guards
title: Retro - Postinstall scripts need environment detection guards
type: gotcha
scope: project
created: "2026-01-20T11:53:13.891Z"
updated: "2026-01-20T11:53:13.891Z"
tags:
  - catastrophic
  - postinstall
  - file-operations
  - path-validation
  - gotcha
  - critical
  - project
severity: critical
---

Created cleanup-old-versions.ts for postinstall hook. Script calculated paths by going up 2 directories, assuming it was in ~/.claude/plugins/cache/enhance/claude-prompt-improver/1.1.3/scripts/. When bun add triggered postinstall from dev directory (/home/gareth/.vs/claude-prompt-improver/), path calculation landed at /home/gareth/.vs/ instead. rmSync() then deleted 23 unrelated projects. 

Prevention: (1) NEVER use destructive operations in postinstall without environment validation, (2) Check import.meta.path contains expected markers, (3) Add fallback that exits safely if paths don't match expected structure, (4) Test postinstall in dev BEFORE committing, (5) ALWAYS push branches to remote before running file-operation scripts.

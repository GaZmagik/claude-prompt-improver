---
id: gotcha-retro-hook-output-format-documentation-required-external-lookup
title: Retro - Hook output format documentation required external lookup
type: gotcha
scope: project
created: "2026-01-22T13:42:05.678Z"
updated: "2026-01-22T13:42:05.678Z"
tags:
  - retrospective
  - process
  - documentation
  - hooks
  - project
severity: medium
---

v1.3.3 required fixing additionalContext output format. The correct format (wrapped in hookSpecificOutput) was not immediately obvious from code comments. Had to use WebFetch to check Claude Code docs. Always link to official docs in comments when API contracts are non-obvious.

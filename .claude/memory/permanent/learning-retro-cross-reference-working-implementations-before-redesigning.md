---
id: learning-retro-cross-reference-working-implementations-before-redesigning
title: Retro - Cross-reference working implementations before redesigning
type: learning
scope: project
created: "2026-01-22T13:39:16.326Z"
updated: "2026-01-22T13:39:16.326Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

When fork-session was broken, examining ~/.claude/hooks/archive/user-prompt-quality-check.sh revealed the working pattern. Instead of designing from scratch, we analysed what made it work (--debug flag, run from cwd, no --output-format json) and applied those patterns. This was faster and more reliable than theorising. Pattern: Look for existing working code before implementing new solutions.

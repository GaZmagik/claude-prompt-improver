---
id: learning-retro-capture-actual-hook-input-format-before-implementing-parser
title: Retro - Capture actual hook input format before implementing parser
type: learning
scope: project
created: "2026-01-21T13:01:36.493Z"
updated: "2026-01-21T13:01:36.493Z"
tags:
  - retrospective
  - process
  - hooks
  - debugging
  - project
severity: high
---

We spent significant time debugging why the prompt improver hook failed silently. The root cause was a mismatch between expected input format (nested context with message_index) and actual Claude Code format (flat structure with session_id). We discovered this only by capturing real stdin and comparing. For future hook development: always capture and log actual inputs early, don't assume the format from documentation or inference.

---
id: gotcha-forked-session-retrospective-output-may-not-surface-completely-to-main-session
title: Forked session retrospective output may not surface completely to main session
type: gotcha
scope: project
created: "2026-01-19T08:13:33.170Z"
updated: "2026-01-19T08:13:33.170Z"
tags:
  - forked-sessions
  - memory
  - retrospective
  - session-management
  - project
---

When running memory-capture or retrospective in forked sessions, full agent output sometimes truncates or doesnt propagate back. Main session may miss important insights unless explicitly logged to disk. Always check .claude/logs/ directly.

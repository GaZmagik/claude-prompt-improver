---
id: gotcha-gotcha-forked-session-retrospective-output-may-not-surface-completely-to-main-session
title: Gotcha - Forked session retrospective output may not surface completely to main session
type: gotcha
scope: project
created: "2026-01-18T23:05:40.377Z"
updated: "2026-01-18T23:05:40.377Z"
tags:
  - retrospective
  - process
  - hooks
  - gotcha
  - project
severity: medium
---

Retrospective hook in forked session produced output that ended mid-transition. Hook output ending messages should be captured explicitly or surfaced to main session via stdout/stderr to prevent context loss. Consider: (1) explicit retrospective complete marker in hook output, (2) final summary logged separately, or (3) hook completion signal independent of message content.

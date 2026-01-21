---
id: gotcha-retro-silent-error-handling-masks-integration-failures
title: Retro - Silent error handling masks integration failures
type: gotcha
scope: project
created: "2026-01-21T19:21:28.636Z"
updated: "2026-01-21T19:21:28.636Z"
tags:
  - retrospective
  - process
  - error-handling
  - project
severity: high
---

The hook had silent try/catch blocks that swallowed all errors and returned passthrough without explanation. When Claude API timed out or git context gathering failed, users saw no indication. Fixed by: (1) propagating error messages through result types, (2) using bypassReason='improvement_failed', (3) logging as ERROR level. This prevents users wondering why improvements stopped working.

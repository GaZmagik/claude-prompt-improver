---
id: gotcha-hook-improvement-failures-silent-without-error-details
title: Hook improvement failures silent without error details
type: gotcha
scope: project
created: "2026-01-21T19:21:30.980Z"
updated: "2026-01-21T19:21:30.980Z"
tags:
  - hook-debugging
  - error-visibility
  - api-failures
  - project
---

When Claude API times out or fails, hook returned passthrough with no bypassReason. Fixed by: (1) Adding improvement_failed bypass reason, (2) Propagating error field through ImprovementResult, (3) Logging ERROR-level entries with actual error messages.

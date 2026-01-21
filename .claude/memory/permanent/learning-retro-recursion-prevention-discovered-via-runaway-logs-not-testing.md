---
id: learning-retro-recursion-prevention-discovered-via-runaway-logs-not-testing
title: Retro - Recursion prevention discovered via runaway logs, not testing
type: learning
scope: project
created: "2026-01-21T13:31:43.979Z"
updated: "2026-01-21T13:31:43.979Z"
tags:
  - retrospective
  - process
  - debugging
  - hooks
  - project
severity: medium
---

Hook recursion bug (UserPromptSubmit hooks triggering on spawned Claude subprocess) was discovered by reading hook stdin logs showing exponential XML escaping, not by running tests. This led to quick root-cause identification and fix. Process insight: Log inspection as debugging tool is underutilized. Consider adding more instrumented logging to hook workflows for observability when integration tests miss edge cases.

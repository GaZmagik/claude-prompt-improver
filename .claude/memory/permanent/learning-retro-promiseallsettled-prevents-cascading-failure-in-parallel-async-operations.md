---
id: learning-retro-promiseallsettled-prevents-cascading-failure-in-parallel-async-operations
title: Retro - Promise.allSettled prevents cascading failure in parallel async operations
type: learning
scope: project
created: "2026-01-19T10:29:29.516Z"
updated: "2026-01-19T10:29:29.516Z"
tags:
  - retrospective
  - process
  - performance
  - async-patterns
  - project
severity: medium
---

When parallelizing multiple async context sources (git, lsp, spec, memory, session), using Promise.allSettled instead of Promise.all ensures that if one context source fails or times out, the others continue. This reduces latency (all run in parallel) while maintaining resilience. Each source has its own timeout, so individual failures don't cascade.

---
id: learning-plugin-invisibility-is-core-problem-not-missing-features
title: Plugin invisibility is core problem, not missing features
type: learning
scope: project
created: "2026-01-19T13:56:45.592Z"
updated: "2026-01-19T13:56:45.592Z"
tags:
  - plugin
  - observability
  - prompt-improvement
  - visibility
  - project
---

During deliberation on visibility features, discovered the real issue: plugin hook executes successfully but users can't see what happened or if improvements were applied. 100ms latency constraint incompatible with LLM-based improvements (need 2-30s). MVP should prioritize observability (improvement reports, structured logging) before advanced features.

---
id: learning-retro-reuse-existing-calculations-to-avoid-duplicate-work
title: Retro - Reuse existing calculations to avoid duplicate work
type: learning
scope: project
created: "2026-01-24T00:29:42.398Z"
updated: "2026-01-24T00:29:42.398Z"
tags:
  - retrospective
  - process
  - architecture
  - efficiency
  - project
severity: medium
---

When hooks needed context usage percentage, instead of recalculating from transcript (adds latency, duplicate logic), leveraged statusline which already calculates this. Statusline now caches to /tmp/context-usage-{sessionId}.log, hooks read from there. Avoids reimplementation and keeps calculations single-source-of-truth.

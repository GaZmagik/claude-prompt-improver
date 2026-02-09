---
id: learning-prompt-improver-context-gathering-overhead-quantified
title: prompt-improver-context-gathering-overhead-quantified
type: learning
scope: project
created: "2026-02-08T23:29:36.667Z"
updated: "2026-02-08T23:29:36.667Z"
tags:
  - prompt-improver
  - context
  - performance
  - latency
  - measurement
  - project
---

Context integrations (git, memory, pluginResources) add ~5.3s to prompt improvement latency, with API call taking ~50s total. When disabled, API call drops to ~33s. This suggests API cost grows with context size, but overhead is manageable and not the bottleneck. The 30-50s API latency is fundamentally incompatible with synchronous UserPromptSubmit hooks.

---
id: decision-hook-timeout-120-seconds-opus-support
title: hook timeout set to 120 seconds for opus support
type: decision
scope: project
created: "2026-01-22T13:42:31.157Z"
updated: "2026-01-22T13:42:31.157Z"
tags:
  - hook-timeout
  - opus
  - performance
  - configuration
  - project
---

Set hooks.json hook timeout from 90s to 120s to support Opus model on large sessions. Rationale: Sonnet/Haiku finish <20s, Opus ~87s. 120s provides sufficient headroom for all models without penalising faster ones. Alternative (model-specific timeouts) rejected due to static hooks.json.

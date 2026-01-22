---
id: learning-opus-timeout-on-large-sessions-requires-hook-timeout-increase
title: opus timeout on large sessions requires hook timeout increase
type: learning
scope: project
created: "2026-01-22T13:42:12.294Z"
updated: "2026-01-22T13:42:12.294Z"
tags:
  - opus
  - timeout
  - hook-timeout
  - large-sessions
  - performance
  - project
---

Opus takes ~87s on 193MB sessions (fork-session overhead + API latency). Hook timeout must be >= model_timeout + overhead. Bumping hook timeout from 90s to 120s accommodates Opus whilst not affecting faster models (Haiku/Sonnet complete in <20s).

---
id: learning-retro-session-scoped-ephemeral-cache-prevents-multi-session-conflicts
title: Retro - Session-scoped ephemeral cache prevents multi-session conflicts
type: learning
scope: project
created: "2026-01-24T00:29:42.568Z"
updated: "2026-01-24T00:33:34.083Z"
tags:
  - retrospective
  - process
  - architecture
  - design-patterns
  - project
  - caching
  - infrastructure
severity: low
---

When implementing context usage cache, chose /tmp/context-usage-{sessionId}.log instead of ~/.claude/cache/. Benefits: prevents overwriting when multiple sessions run concurrently, auto-cleans on reboot (ephemeral), keeps ~/.claude clean. Pattern: session-scoped state in /tmp/, persistent state in ~/.claude/.

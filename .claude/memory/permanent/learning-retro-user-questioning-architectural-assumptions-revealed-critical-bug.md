---
id: learning-retro-user-questioning-architectural-assumptions-revealed-critical-bug
title: Retro - User questioning architectural assumptions revealed critical bug
type: learning
scope: project
created: "2026-01-19T22:08:06.614Z"
updated: "2026-01-19T22:08:06.614Z"
tags:
  - retrospective
  - process
  - architecture
  - testing
  - project
severity: high
---

When user questioned whether the plugin could fork from itself, it prompted investigation into the fork-session architecture. This discovered that --resume <sessionId> --fork-session wouldn't work from UserPromptSubmit hooks (circular dependency). Rather than assuming the design was correct, validating with real testing exposed the flaw. The fix (removing fork-session entirely) made the plugin simpler and actually functional.

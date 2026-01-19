---
id: learning-retro-gotcha-caching-in-session-restore-prevented-fork-session-pitfall
title: Retro - Gotcha caching in session restore prevented fork-session pitfall
type: learning
scope: project
created: "2026-01-19T01:10:40.599Z"
updated: "2026-01-19T01:10:40.599Z"
tags:
  - retrospective
  - process
  - memory
  - gotchas
  - project
severity: medium
---

Session restore loaded 6 critical gotchas upfront (fork-session hangs from project dir, 90s timeout requirement, exactOptionalPropertyTypes friction). Having these cached prevented reimplementing known pitfalls. Process: Always check memory for gotchas BEFORE starting phase work via /memory search.

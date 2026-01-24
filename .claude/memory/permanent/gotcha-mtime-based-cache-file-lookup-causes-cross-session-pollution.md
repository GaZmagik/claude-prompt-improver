---
id: gotcha-mtime-based-cache-file-lookup-causes-cross-session-pollution
title: Mtime-based cache file lookup causes cross-session pollution
type: gotcha
scope: project
created: "2026-01-24T10:07:14.732Z"
updated: "2026-01-24T10:07:14.732Z"
tags:
  - caching
  - concurrency
  - session-isolation
  - project
---

When multiple Claude Code sessions share a /tmp directory, finding cache files by modification time (most recent) can serve stale data from other sessions. Use session-specific identifiers (like CLAUDE_CODE_SSE_PORT) instead of mtime heuristics.

---
id: artifact-lru-cache-eviction-pattern
title: LRU Cache Eviction Pattern
type: artifact
scope: project
created: "2026-01-21T18:51:23.934Z"
updated: "2026-01-21T18:51:23.934Z"
tags:
  - caching
  - lru
  - memory-management
  - patterns
  - project
---

Bound cache memory by tracking access order with Map iteration order. When cache exceeds MAX_SIZE (e.g., 50), delete oldest entry before inserting new one. Use getOldestKey() helper to retrieve first Map entry (oldest by insertion/access order). Prevents unbounded memory growth in long-running processes.

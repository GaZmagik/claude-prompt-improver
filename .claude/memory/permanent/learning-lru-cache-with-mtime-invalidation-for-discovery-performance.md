---
id: learning-lru-cache-with-mtime-invalidation-for-discovery-performance
title: LRU Cache with mtime Invalidation for Discovery Performance
type: learning
scope: project
created: "2026-01-21T21:19:42.753Z"
updated: "2026-01-21T21:19:42.753Z"
tags:
  - caching
  - performance
  - filesystem
  - discovery
  - project
---

Implement cache with automatic invalidation: store mtime alongside cached items, compare on access. Evicts oldest entry when capacity reached. Note: Date.now() granularity can cause timing issues in rapid test operations.

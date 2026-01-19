---
id: learning-configuration-caching-with-mtime-invalidation
title: Configuration caching with mtime invalidation
type: learning
scope: project
created: "2026-01-19T11:02:22.354Z"
updated: "2026-01-19T11:02:22.354Z"
tags:
  - caching
  - performance
  - config
  - testing
  - project
---

Cache config files by path with mtime tracking. Invalidate when mtime differs from cached value. Requires cache.clearCache() in beforeEach to prevent test pollution between cases.

---
id: learning-lru-cache-with-mtime-invalidation-for-discovery-performance
title: LRU cache with mtime invalidation for discovery performance
type: learning
scope: project
created: "2026-01-21T20:47:43.075Z"
updated: "2026-01-21T20:47:43.075Z"
tags:
  - performance
  - caching
  - optimization
  - pattern
  - project
---

Adopted LRU cache pattern with mtime-based invalidation (borrowed from spec-awareness.ts). Cache limit 50 entries prevents repeated filesystem scans during prompt improvement. Uses Node.js fs.readdir with { recursive: true, withFileTypes: true } for efficient directory traversal.

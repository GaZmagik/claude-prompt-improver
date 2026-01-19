---
id: learning-spec-file-caching-uses-mtime-based-invalidation-pattern
title: Spec file caching uses mtime-based invalidation pattern
type: learning
scope: project
created: "2026-01-19T11:38:08.219Z"
updated: "2026-01-19T11:38:08.219Z"
tags:
  - project
---

Added mtime-based caching to spec-awareness.ts following config-loader.ts pattern. Cache stores {content, mtime} and invalidates when file's mtime changes. Prevents repeated filesystem reads during multiple context gathering calls.

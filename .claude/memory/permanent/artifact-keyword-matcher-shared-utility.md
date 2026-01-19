---
id: artifact-keyword-matcher-shared-utility
title: Shared keyword matching utility
type: artifact
scope: project
created: "2026-01-19T11:02:36.745Z"
updated: "2026-01-19T11:02:36.745Z"
tags:
  - refactoring
  - utilities
  - deduplication
  - matching
  - project
---

Extracted common patterns from skill-matcher and agent-suggester into keyword-matcher.ts. Provides normaliseKeywords(), matchesKeyword(), and scoreMatches() functions. Reduces duplication and centralises matching logic for testing and maintenance.

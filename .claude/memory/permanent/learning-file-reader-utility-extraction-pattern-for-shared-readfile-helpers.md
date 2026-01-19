---
id: learning-file-reader-utility-extraction-pattern-for-shared-readfile-helpers
title: File-reader utility extraction pattern for shared readFile helpers
type: learning
scope: project
created: "2026-01-19T18:16:28.300Z"
updated: "2026-01-19T18:16:28.300Z"
tags:
  - refactoring
  - utilities
  - deduplication
  - typescript
  - testing
  - project
---

Multiple integrations (memory-plugin.ts, spec-awareness.ts) have identical readFile helper functions. Extraction pattern: Create hooks/src/utils/file-reader.ts with exported readFile and readFileWithMtime functions, update imports in both integrations. Reduces code duplication and centralises mock filesystem handling.

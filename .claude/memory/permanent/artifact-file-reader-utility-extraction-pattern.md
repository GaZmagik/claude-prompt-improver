---
id: artifact-file-reader-utility-extraction-pattern
title: File-reader utility extraction pattern for shared readFile helpers
type: artifact
scope: project
created: "2026-01-19T18:53:44.942Z"
updated: "2026-01-19T18:53:44.942Z"
tags:
  - refactoring
  - code-reuse
  - utilities
  - typescript
  - project
---

When duplicated readFile functions exist across multiple modules (e.g., memory-plugin.ts, spec-awareness.ts), extract into shared hooks/src/utils/file-reader.ts with readFileSyncSafe() function. Include mock filesystem support for testing. Pattern: create utility file with proper TypeScript exports, write comprehensive tests (8 test cases minimum), then refactor all call sites to use the shared utility.

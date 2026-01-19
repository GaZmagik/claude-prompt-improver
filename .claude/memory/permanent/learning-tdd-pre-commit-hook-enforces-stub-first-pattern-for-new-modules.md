---
id: learning-tdd-pre-commit-hook-enforces-stub-first-pattern-for-new-modules
title: TDD pre-commit hook enforces stub-first pattern for new modules
type: learning
scope: project
created: "2026-01-19T11:02:48.773Z"
updated: "2026-01-19T11:02:48.773Z"
tags:
  - tdd
  - pre-commit-hooks
  - testing
  - workflow
  - project
---

Pre-commit hook (tdd-typescript.ts) blocks direct Write calls for new .spec.ts files. Forces touch -> Read -> Write workflow: create stubs first, then write tests, then implementation. Prevents spec files from being created without reading first.

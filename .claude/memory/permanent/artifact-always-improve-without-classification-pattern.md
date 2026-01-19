---
id: artifact-always-improve-without-classification-pattern
title: Always-improve without classification pattern
type: artifact
scope: project
created: "2026-01-19T22:08:37.857Z"
updated: "2026-01-19T22:08:37.857Z"
tags:
  - architecture
  - pattern
  - prompt-improver
  - refactoring
  - project
---

Restructured prompt improver to always improve prompts >10 tokens without classification overhead. Single API call architecture replaces the NONE/SIMPLE/COMPLEX system. Config-driven model selection (haiku/sonnet/opus) enables flexibility. 614/614 tests passing, 96.21% coverage validates the pattern.

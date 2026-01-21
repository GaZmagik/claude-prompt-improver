---
id: learning-retro-mock-filesystem-pattern-with-mockfilesystem-enables-deterministic-testing
title: Retro - Mock filesystem pattern with _mockFileSystem enables deterministic testing
type: learning
scope: project
created: "2026-01-21T21:19:18.409Z"
updated: "2026-01-21T21:19:18.409Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: medium
---

Using _mockFileSystem option in utilities (directory-scanner, dynamic-discovery) enables fast, deterministic tests without real filesystem I/O. Pattern: pass mock option through function call chain, check at leaf level. This accelerated Phase 1-3 testing to 65 tests in ~1 hour with zero flakiness.

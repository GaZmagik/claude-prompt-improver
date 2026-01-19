---
id: artifact-always-improve-production-restructuring-pattern
title: Production restructuring pattern for classification system removal
type: artifact
scope: project
created: "2026-01-19T22:35:31.091Z"
updated: "2026-01-19T22:35:31.091Z"
tags:
  - always-improve
  - refactoring
  - pattern
  - project
---

Complete pattern for removing classification systems from production plugins: identify all entry points (CLI, hooks, API), remove classification fields from types, update all call sites to pass fresh session data, validate through integration tests with real session IDs, use 8-agent review before shipping.

---
id: decision-v1.6.0-incomplete-release-scope
title: v1.6.0 released with partial implementation - plugin-scanner only
type: decision
scope: project
created: "2026-01-24T11:14:12.549Z"
updated: "2026-01-24T11:14:12.549Z"
tags:
  - versioning
  - release-scope
  - incomplete-features
  - project
---

PR #26 ships only plugin-scanner.ts (plugin discovery) but CHANGELOG claims resource-formatter.ts, XML output, language detection, and Speckit integration. Only 11 tests vs claimed 50. Decision: Either complete remaining features in follow-up PR or update CHANGELOG to match scanner-only implementation. Current state risks user confusion.

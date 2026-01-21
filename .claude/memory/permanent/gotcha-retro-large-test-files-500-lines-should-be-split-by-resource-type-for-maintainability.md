---
id: gotcha-retro-large-test-files-500-lines-should-be-split-by-resource-type-for-maintainability
title: Retro - Large test files (500+ lines) should be split by resource type for maintainability
type: gotcha
scope: project
created: "2026-01-21T21:19:22.029Z"
updated: "2026-01-21T21:19:22.029Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: medium
---

Dynamic-discovery.spec.ts grew to 581 lines combining agent, command, and output-style tests. This made the file hard to navigate. Future multi-resource modules should split tests by type (agents.spec.ts, commands.spec.ts, styles.spec.ts) to keep files under 200-250 lines. Also: declare all exports upfront before writing tests to avoid dynamic imports.

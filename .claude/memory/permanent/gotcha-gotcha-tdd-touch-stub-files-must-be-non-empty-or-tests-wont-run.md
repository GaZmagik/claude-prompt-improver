---
id: gotcha-gotcha-tdd-touch-stub-files-must-be-non-empty-or-tests-wont-run
title: Gotcha - TDD touch stub files must be non-empty or tests won't run
type: gotcha
scope: project
created: "2026-01-19T18:53:36.874Z"
updated: "2026-01-19T18:53:36.874Z"
tags:
  - retrospective
  - tdd
  - test-runners
  - typescript
  - project
severity: medium
---

When using TDD workflow with touch to create stub files before Write, the touched file remains 0 bytes. Test runners don't detect or execute tests in completely empty files. After touching file-reader.spec.ts, tests showed '0 pass 0 fail' and TypeScript error about non-module. Solution: touch creates the stub correctly for TDD workflow (hook bypass), but the Write tool must immediately follow with actual test content. Don't defer writing the test file.

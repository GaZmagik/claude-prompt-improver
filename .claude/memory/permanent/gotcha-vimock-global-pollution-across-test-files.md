---
id: gotcha-vimock-global-pollution-across-test-files
title: vi.mock() global pollution across test files
type: gotcha
scope: project
created: "2026-01-19T09:40:08.221Z"
updated: "2026-01-19T09:40:08.221Z"
tags:
  - testing
  - bun
  - vitest
  - mocking
  - gotcha
  - project
---

When using vi.mock() and mock.module() in Bun tests, mocks persist globally across test files. Creating an integration test file with mock.module() polluted other tests (session-context.spec.ts). Solution: Keep mocks local to test files or use separate mock file. Do not use global mock.module() calls in test suites.

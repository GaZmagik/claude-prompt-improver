---
id: gotcha-retro-read-function-signatures-before-writing-test-code-to-avoid-iteration
title: Retro - Read function signatures before writing test code to avoid iteration
type: gotcha
scope: project
created: "2026-01-19T18:15:39.809Z"
updated: "2026-01-19T18:15:39.809Z"
tags:
  - retrospective
  - process
  - testing
  - workflow
  - project
severity: medium
---

When writing integration tests, I wrote test calls for buildContext() and classifyPrompt() without first reading the actual function signatures. This caused test failures requiring signature verification and fixes. Should always read actual implementation signatures before writing tests that call those functions. This is especially important for external APIs with optional parameters.

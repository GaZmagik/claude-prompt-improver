---
id: gotcha-retro-integration-test-parity-critical-for-orchestration-features
title: Retro - Integration test parity critical for orchestration features
type: gotcha
scope: project
created: "2026-01-24T13:50:44.180Z"
updated: "2026-01-24T13:50:44.180Z"
tags:
  - retrospective
  - process
  - testing
  - quality-gates
  - project
severity: high
---

PR #27 passed 784 unit tests and code review but the v1.6.0 pluginResources feature was completely non-functional (never wired into improve-prompt.ts). Root cause: tests validated output shape (if context has pluginResources, format it as XML) but never validated the full pipeline (discover resources → build context → format → inject into prompt). Unit tests used mocks with pre-baked pluginResources data, never hitting the actual context-builder discovery code. This created a false confidence that the feature worked. Prevention: Enforce integration tests that exercise the full end-to-end orchestration path, not just individual components. For features that wire multiple modules together, require integration tests that prove the whole pipeline actually works.

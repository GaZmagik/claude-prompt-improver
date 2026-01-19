---
id: gotcha-retro-integration-tests-must-validate-interface-signatures-before-writing-assertions
title: Retro - Integration tests must validate interface signatures before writing assertions
type: gotcha
scope: project
created: "2026-01-19T11:37:56.423Z"
updated: "2026-01-19T11:37:56.423Z"
tags:
  - retrospective
  - testing
  - integration-tests
  - gotcha
  - project
severity: high
---

Tests 1-4 of integration.spec.ts failed because they relied on mock patterns that didn't match actual implementations (PLUGIN_PATHS exact paths, SpecContext property names like featureName). The issue wasn't logic—it was incorrect test setup assuming behavior without verification. Prevention: Write a quick exploratory integration test first to validate the interface contract (what properties exist, what paths are checked) before writing the full test suite.

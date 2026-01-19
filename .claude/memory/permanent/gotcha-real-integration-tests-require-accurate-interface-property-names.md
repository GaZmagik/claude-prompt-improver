---
id: gotcha-real-integration-tests-require-accurate-interface-property-names
title: Real integration tests require accurate interface property names
type: gotcha
scope: project
created: "2026-01-19T11:02:42.591Z"
updated: "2026-01-19T11:02:42.591Z"
tags:
  - testing
  - integration-tests
  - interfaces
  - type-safety
  - project
---

When implementing integration tests for real filesystem operations, verify actual interface properties (e.g., SpecContext uses 'featureName' not 'specFile'). Type-safe but integration tests fail if test setup doesn't match runtime interfaces.

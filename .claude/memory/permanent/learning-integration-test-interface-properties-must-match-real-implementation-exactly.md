---
id: learning-integration-test-interface-properties-must-match-real-implementation-exactly
title: Integration test interface properties must match real implementation exactly
type: learning
scope: project
created: "2026-01-19T11:38:00.045Z"
updated: "2026-01-19T11:38:00.045Z"
tags:
  - project
---

Fixed spec-awareness and memory-plugin integration tests by ensuring mock object properties match actual implementation. Mock filesystem paths must align with PLUGIN_PATHS constants; test feature paths must be absolute paths to directories containing spec.md.

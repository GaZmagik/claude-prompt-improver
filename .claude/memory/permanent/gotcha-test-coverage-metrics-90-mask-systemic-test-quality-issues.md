---
id: gotcha-test-coverage-metrics-90-mask-systemic-test-quality-issues
title: Test coverage metrics (90%+) mask systemic test quality issues
type: gotcha
scope: project
created: "2026-01-19T10:04:53.300Z"
updated: "2026-01-19T10:04:53.300Z"
tags:
  - testing
  - quality-assurance
  - metrics
  - project
---

High test coverage does not guarantee test quality. /speckit:review found test cheating patterns (mocks bypassing logic, missing validations), unused imports, and loose assertions despite 90.35% coverage. Review agent specifically examines test assertion quality, which coverage metrics ignore.

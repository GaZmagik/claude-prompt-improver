---
id: gotcha-gotcha-dead-code-unused-constants-only-discovered-during-comprehensive-review
title: Gotcha - Dead code (unused constants) only discovered during comprehensive review
type: gotcha
scope: project
created: "2026-01-21T14:14:58.770Z"
updated: "2026-01-21T14:14:58.770Z"
tags:
  - retrospective
  - process
  - code-quality
  - linting
  - project
severity: low
---

During feature cleanup, 5 unused timeout constants were found in constants.ts (CLASSIFICATION_TIMEOUT_MS, SIMPLE_IMPROVEMENT_TIMEOUT_MS, COMPLEX_IMPROVEMENT_TIMEOUT_MS, etc.). These were removed as dead code. Prevention: Enable eslint no-unused-vars during CI/development. Dead constants can accumulate during refactoring and only surface during pre-shipping reviews. Earlier detection would have prevented them from being committed.

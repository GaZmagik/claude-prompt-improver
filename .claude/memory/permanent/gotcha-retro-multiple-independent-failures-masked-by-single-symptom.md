---
id: gotcha-retro-multiple-independent-failures-masked-by-single-symptom
title: Retro - Multiple independent failures masked by single symptom
type: gotcha
scope: project
created: "2026-01-22T13:39:22.028Z"
updated: "2026-01-22T13:39:22.028Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

Fork-session v1.3.1 timeout appeared to be one problem, but was actually THREE: (1) --output-format json causes hangs, (2) --debug flag required due to CLI bug, (3) must run from project cwd not /tmp. Each was independently solvable but together they compounded. Lesson: When investigating failures, test each component independently rather than assuming monolithic cause. Use binary search/isolation.

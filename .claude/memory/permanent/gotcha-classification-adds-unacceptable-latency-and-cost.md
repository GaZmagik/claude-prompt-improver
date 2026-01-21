---
id: gotcha-classification-adds-unacceptable-latency-and-cost
title: Classification adds unacceptable latency and cost
type: gotcha
scope: project
created: "2026-01-21T13:31:47.941Z"
updated: "2026-01-21T13:31:47.941Z"
tags:
  - architecture
  - prompt-improver
  - performance
  - cost
  - project
---

NONE/SIMPLE/COMPLEX classification requires 2 API calls (4-9s latency, 2x cost). Rejected in favour of single-call architecture with config-driven model selection. Fix: skip classification entirely, improve all non-bypassed prompts with configured improverModel.

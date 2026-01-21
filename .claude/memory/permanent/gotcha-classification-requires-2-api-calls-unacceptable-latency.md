---
id: gotcha-classification-requires-2-api-calls-unacceptable-latency
title: Classification requires 2 API calls - unacceptable latency
type: gotcha
scope: project
created: "2026-01-21T13:28:08.885Z"
updated: "2026-01-21T13:28:08.885Z"
tags:
  - prompt-improver
  - classification
  - performance
  - architecture
  - project
severity: high
---

Implementing NONE/SIMPLE/COMPLEX classification requires 2 sequential Claude API calls: (1) classify with Haiku, (2) improve with Haiku/Sonnet. This adds 4-9 seconds latency and doubles costs. The single-call approach (always improve with configured model) is the correct architecture. Model selection should be config-driven via prompt-improver.local.md, not dynamic classification.

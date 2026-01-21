---
id: learning-classification-rejected-due-to-latency-and-cost
title: Classification rejected due to latency and cost
type: learning
scope: project
created: "2026-01-21T13:52:36.885Z"
updated: "2026-01-21T13:52:36.885Z"
tags:
  - classification
  - latency
  - performance
  - decision-rationale
  - project
---

Classification model selection (distinguishing simple vs complex prompts) added 2 extra API calls = 4-9s latency per prompt improvement. Cost-benefit analysis favoured single improverModel (Haiku) over two-tier approach. Simplified config eliminates this overhead.

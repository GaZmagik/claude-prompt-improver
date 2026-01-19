---
id: decision-prompt-improver-always-improve-no-classification
title: prompt-improver-always-improve-no-classification
type: decision
scope: project
created: "2026-01-19T20:44:17.018Z"
updated: "2026-01-19T20:44:17.018Z"
tags:
  - prompt-improver
  - architecture
  - decision
  - project
---

Decided to remove NONE classification entirely and always improve all prompts >10 tokens. Simpler architecture, better UX, trades off token overhead (5-20%) for plugin actually doing something on every prompt.

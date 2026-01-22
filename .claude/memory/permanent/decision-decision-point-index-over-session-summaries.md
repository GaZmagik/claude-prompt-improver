---
id: decision-decision-point-index-over-session-summaries
title: Decision Point Index approach selected for session context
type: decision
scope: project
created: "2026-01-22T01:01:14.090Z"
updated: "2026-01-22T01:01:14.090Z"
tags:
  - architecture
  - session-context
  - prompt-improver
  - project
---

After deliberating three approaches (Session Summaries Index, Micro-Summaries, Embeddings), selected Decision Point Index hybrid approach. Extract decision points from .jsonl transcripts during PreCompact (AskUserQuestion usage, architectural choices, user questions), store as lightweight JSON index (~300 bytes per point), query by keyword at prompt improvement time. Balances nuance preservation, queryability, and storage efficiency without requiring new vector infrastructure.

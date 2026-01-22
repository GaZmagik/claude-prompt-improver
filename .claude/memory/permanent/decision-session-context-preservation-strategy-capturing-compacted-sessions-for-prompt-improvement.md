---
id: decision-session-context-preservation-strategy-capturing-compacted-sessions-for-prompt-improvement
title: Session Context Preservation Strategy - Capturing compacted sessions for prompt improvement
type: decision
scope: project
created: "2026-01-22T00:03:07.167Z"
updated: "2026-01-22T00:03:07.167Z"
tags:
  - promoted-from-think
  - project
---

# Session Context Preservation Strategy - Capturing compacted sessions for prompt improvement

DECISION: Implement Decision Point Index (Hybrid Approach D). During PreCompact, parse .jsonl transcripts to extract decision points (AskUserQuestion usage, user questions, architectural choices). Store as lightweight JSON index (~200-300 bytes per point) with context: question, options considered, choice made, why. At prompt improvement time, keyword-search this index and inject matched decision segments + 3-4 surrounding lines for narrative context. This preserves nuance without full transcript bloat, uses existing data, and is queryable without embeddings.

_Deliberation: `thought-20260121-231745372`_

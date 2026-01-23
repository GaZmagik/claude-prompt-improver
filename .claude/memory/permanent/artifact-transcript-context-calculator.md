---
id: artifact-transcript-context-calculator
title: Transcript-based context calculator pattern
type: artifact
scope: project
created: "2026-01-22T19:58:50.977Z"
updated: "2026-01-22T19:58:50.977Z"
tags:
  - hooks
  - context
  - pattern
  - parser
  - project
---

Parse session .jsonl transcript to extract context usage. Pattern: Read transcript line-by-line, find last assistant message, extract input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens. Account for autocompact buffer (22.5% of 200K = 155K usable). Compare to threshold to trigger low_context bypass.

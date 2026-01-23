---
id: learning-transcript-based-context-detection-from-jsonl
title: Transcript-based context detection from .jsonl
type: learning
scope: project
created: "2026-01-22T19:58:52.028Z"
updated: "2026-01-22T19:58:52.028Z"
tags:
  - hooks
  - context
  - transcript
  - workaround
  - context-calculation
  - project
---

Can calculate context usage by parsing session transcript files (.jsonl). Sum input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens from the last assistant message to get current context size. Use this when Claude Code does not provide context_usage data directly to hooks.

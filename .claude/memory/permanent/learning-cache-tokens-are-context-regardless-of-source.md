---
id: learning-cache-tokens-are-context-regardless-of-source
title: Cache tokens are context (regardless of source)
type: learning
scope: project
created: "2026-01-22T19:59:01.880Z"
updated: "2026-01-22T19:59:01.880Z"
tags:
  - context
  - tokens
  - cache
  - calculation
  - project
---

Cache tokens (cache_read_input_tokens and cache_creation_input_tokens) ARE counted as context usage. Even though they are served from cache rather than fresh API calls, they represent context that Claude has to track and process. Include them in context calculations.

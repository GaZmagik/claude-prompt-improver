---
id: learning-use-claudecodesseport-for-session-specific-hook-caching
title: Use CLAUDE_CODE_SSE_PORT for session-specific hook caching
type: learning
scope: project
created: "2026-01-24T00:52:32.024Z"
updated: "2026-01-24T00:52:32.024Z"
tags:
  - hooks
  - context
  - caching
  - statusline
  - sse-port
  - session
  - project
---

Hooks don't receive session_id in stdin, but CLAUDE_CODE_SSE_PORT env var is available to both statusline and hooks. Use SSE port as session identifier for cache files: statusline writes to /tmp/context-usage-port-{port}.log, hooks read from same path. This provides true session isolation without mtime-based guessing.

---
id: learning-use-claudecodesseport-for-session-specific-hook-caching
title: Use CLAUDE_CODE_SSE_PORT for session-specific hook caching
type: learning
scope: project
created: "2026-01-24T10:07:18.999Z"
updated: "2026-01-24T10:07:18.999Z"
tags:
  - hooks
  - caching
  - session-isolation
  - project
---

Hooks can use the CLAUDE_CODE_SSE_PORT environment variable to create session-specific cache files. Each Claude Code instance gets a unique SSE port, enabling true session isolation without needing session_id. Pattern: /tmp/context-usage-port-${CLAUDE_CODE_SSE_PORT}.log

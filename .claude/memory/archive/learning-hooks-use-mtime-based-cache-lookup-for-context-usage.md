---
id: learning-hooks-use-mtime-based-cache-lookup-for-context-usage
title: Hooks use mtime-based cache lookup for context usage
type: learning
scope: project
created: "2026-01-24T00:45:05.400Z"
updated: "2026-01-24T00:45:05.400Z"
tags:
  - hooks
  - context
  - caching
  - statusline
  - mtime
  - project
---

Claude Code command hooks don't receive session_id in stdin - only the statusline does. To share context percentage from statusline to hooks: (1) statusline writes to /tmp/context-usage-{session_id}.log, (2) hooks find the most recently modified context-usage-*.log file by mtime. This preserves multi-session isolation while working without session_id access.

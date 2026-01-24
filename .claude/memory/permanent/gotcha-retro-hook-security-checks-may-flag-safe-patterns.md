---
id: gotcha-retro-hook-security-checks-may-flag-safe-patterns
title: Retro - Hook security checks may flag safe patterns
type: gotcha
scope: project
created: "2026-01-24T00:29:42.756Z"
updated: "2026-01-24T00:33:32.242Z"
tags:
  - retrospective
  - process
  - hooks
  - security-checking
  - project
  - infrastructure
severity: low
---

PreToolUse hook in hooks directory blocked Edit operations that read from /tmp/context-usage-{sessionId}.log, flagging it as sensitive /tmp/ file access. The check was overzealous—reading a session-scoped cache file is not a path injection risk. Consider: hook rules should distinguish between dynamic path construction (risky) and session-scoped file access (safe pattern).

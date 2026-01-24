---
id: artifact-enhanced-timestamp-hook-pattern
title: Enhanced timestamp hook with timezone and context caching
type: artifact
scope: project
created: "2026-01-24T00:29:27.907Z"
updated: "2026-01-24T00:33:25.704Z"
tags:
  - hooks
  - timestamp
  - context
  - pattern
  - bun
  - project
  - infrastructure
  - retrospective
---

Pattern: PostToolUse and UserPromptSubmit hooks format timestamps with day-of-week, timezone, branch, and optionally cached context usage percentage. Uses Intl API for locale-aware formatting (no subprocess overhead). Statusline writes context% to /tmp/context-usage-${SESSION_ID}.log for hook consumption.

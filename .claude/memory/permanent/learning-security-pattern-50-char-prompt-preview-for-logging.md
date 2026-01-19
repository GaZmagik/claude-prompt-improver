---
id: learning-security-pattern-50-char-prompt-preview-for-logging
title: "Security pattern: 50-char prompt preview for logging"
type: learning
scope: project
created: "2026-01-19T14:30:58.307Z"
updated: "2026-01-19T14:30:58.307Z"
tags:
  - security
  - logging
  - privacy
  - project
---

Always truncate user prompts to first 50 chars when creating log previews. This prevents accidental exposure of sensitive information in log files, even when full logging is enabled.

---
id: gotcha-retro-hook-testing-showed-silent-failures-on-api-timeouts-error-visibility-needed
title: Retro - Hook testing showed silent failures on API timeouts - error visibility needed
type: gotcha
scope: project
created: "2026-01-21T18:51:09.412Z"
updated: "2026-01-21T18:51:09.412Z"
tags:
  - retrospective
  - debugging
  - hook-testing
  - project
severity: medium
---

Some test prompts that should trigger improvement silently returned 'continue: true' (bypass). Couldn't trace root cause - likely API rate limiting or silent errors in improvePrompt path. The hook catches all errors and falls back to passthrough silently (console.error to stderr only). Suggestion: Add debug logging or structured error tracking for improvement failures in production hook. Consider returning error details in systemMessage when improvement fails.

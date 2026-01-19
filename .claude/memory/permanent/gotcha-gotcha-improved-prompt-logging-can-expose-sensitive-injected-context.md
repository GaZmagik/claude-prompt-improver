---
id: gotcha-gotcha-improved-prompt-logging-can-expose-sensitive-injected-context
title: Gotcha - Improved prompt logging can expose sensitive injected context
type: gotcha
scope: project
created: "2026-01-19T15:56:53.078Z"
updated: "2026-01-19T15:56:53.078Z"
tags:
  - retrospective
  - security
  - logging
  - privacy
  - project
severity: high
---

Security expert caught logging issue: While promptPreview is truncated to 50 chars for privacy, the improvedPrompt field logged entire prompt without truncation.

Problem: Improved prompts contain injected context (git commits, LSP diagnostics, file paths, session state) that becomes part of security-sensitive logs.

Solution: Apply same createPromptPreview() truncation to improved prompts in LogEntry:
  improvedPrompt: input.improvedPrompt ? createPromptPreview(input.improvedPrompt) : null

Lessonlearned: Security patterns must be applied consistently across similar fields. One truncated field + one untruncated field = false sense of privacy.

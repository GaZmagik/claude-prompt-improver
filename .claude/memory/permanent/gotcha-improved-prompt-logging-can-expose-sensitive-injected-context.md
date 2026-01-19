---
id: gotcha-improved-prompt-logging-can-expose-sensitive-injected-context
title: Improved prompt logging can expose sensitive injected context
type: gotcha
scope: project
created: "2026-01-19T17:29:56.657Z"
updated: "2026-01-19T17:29:56.657Z"
tags:
  - security
  - logging
  - sensitive-data
  - project
---

The improvedPrompt field in logs was logging full sensitive text including git commits, LSP diagnostics, and file paths without truncation. Fixed with 50-char truncation matching promptPreview. Critical security issue in logging hooks that could expose injected context during debugging. Test coverage added to prevent regression.

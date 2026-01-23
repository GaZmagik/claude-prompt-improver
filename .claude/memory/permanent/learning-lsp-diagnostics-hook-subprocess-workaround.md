---
id: learning-lsp-diagnostics-hook-subprocess-workaround
title: lsp-diagnostics-hook-subprocess-workaround
type: learning
scope: project
created: "2026-01-23T20:29:52.696Z"
updated: "2026-01-23T20:29:52.696Z"
tags:
  - lsp
  - mcp
  - hooks
  - implementation
  - workaround
  - project
---

MCP tools aren't accessible from hooks (external processes). Implemented practical LSP diagnostics using tsc --noEmit subprocess with timeout, caching (5min TTL), and graceful fallback. Hooks can't call mcp__ide__getDiagnostics but can shell out to project's build tools.

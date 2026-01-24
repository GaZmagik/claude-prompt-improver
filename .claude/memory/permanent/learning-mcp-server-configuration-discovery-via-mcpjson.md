---
id: learning-mcp-server-configuration-discovery-via-mcpjson
title: MCP server configuration discovery via .mcp.json
type: learning
scope: project
created: "2026-01-24T00:29:14.552Z"
updated: "2026-01-24T00:29:14.552Z"
tags:
  - mcp
  - discovery
  - configuration
  - tools
  - project
---

MCP servers are configured in .mcp.json files scattered across ~/.claude/plugins/ directory tree. These are the source of truth for discovering available MCP tools. Hook processes cannot access Claude Code's system prompt or loaded tools directly.

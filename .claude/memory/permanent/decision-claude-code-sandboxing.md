---
id: decision-claude-code-sandboxing
title: Claude Code must run in sandboxed environment
type: decision
scope: project
created: "2026-01-20T11:53:29.728Z"
updated: "2026-01-20T11:53:29.728Z"
tags:
  - project
---

Claude Code has unrestricted filesystem access. A single faulty generated script can destroy critical projects. Decision: All Claude Code work must run in Firejail sandbox or container with whitelist of safe directories. Production/work directories must be read-only or excluded. All uncommitted work must be pushed to remote immediately.

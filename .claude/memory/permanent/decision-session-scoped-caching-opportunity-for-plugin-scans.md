---
id: decision-session-scoped-caching-opportunity-for-plugin-scans
title: Session-scoped caching opportunity for plugin scans
type: decision
scope: project
created: "2026-01-24T12:17:37.422Z"
updated: "2026-01-24T12:17:37.422Z"
tags:
  - performance
  - caching
  - plugin-scanner
  - future-enhancement
  - project
---

Plugin scan results could be cached since they do not change often during a session. The scanEnhancePlugins() and scanMcpServers() functions hit the filesystem on every call, but plugin installations are rare during active sessions. Future enhancement: Add session-scoped caching similar to dynamic discovery cache pattern. Cache invalidation could use mtime checks on plugin directories.

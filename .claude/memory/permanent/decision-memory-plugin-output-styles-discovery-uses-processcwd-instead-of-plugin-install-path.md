---
id: decision-memory-plugin-output-styles-discovery-uses-processcwd-instead-of-plugin-install-path
title: Memory plugin output-styles discovery uses process.cwd() instead of plugin install path
type: decision
scope: project
created: "2026-01-24T13:50:56.153Z"
updated: "2026-01-24T13:50:56.153Z"
tags:
  - memory-plugin
  - discovery-bug
  - plugin-systems
  - project
---

The claude-memory-plugin discovery.ts:getStylePaths() checks for output styles in process.cwd() (project directory) rather than the plugin's install location (~/.claude/plugins/cache/enhance/...). Result: 15 output styles bundled in the plugin are never discovered. Workaround: use global styles in ~/.claude/output-styles/. Bug filed: GaZmagik/claude-memory-plugin#18

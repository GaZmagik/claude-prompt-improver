---
id: gotcha-project-scoped-plugin-hooks-dont-auto-load-despite-claude-pluginpluginjson
title: Project-scoped plugin hooks don't auto-load despite .claude-plugin/plugin.json
type: gotcha
scope: project
created: "2026-01-21T13:02:25.060Z"
updated: "2026-01-21T13:02:25.060Z"
tags:
  - plugins
  - plugin-development
  - hooks
  - marketplace
  - project
---

Having .claude-plugin/plugin.json and hooks/hooks.json does NOT auto-register hooks with Claude Code. /plugin install only works with marketplace plugins. Local dev requires manually adding hooks to ~/.claude/settings.json with absolute paths.

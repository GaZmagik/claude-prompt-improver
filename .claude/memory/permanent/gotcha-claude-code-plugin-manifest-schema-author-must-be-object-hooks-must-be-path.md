---
id: gotcha-claude-code-plugin-manifest-schema-author-must-be-object-hooks-must-be-path
title: "Claude Code plugin manifest schema: author must be object, hooks must be path"
type: gotcha
scope: project
created: "2026-01-19T13:56:57.884Z"
updated: "2026-01-19T13:56:57.884Z"
tags:
  - plugin
  - manifest
  - installation
  - schema
  - project
---

Plugin installation failed because plugin.json had invalid schema: author was a string instead of object with name/url fields, hooks array was inline instead of path to hooks.json file, displayName is not a valid field. Correct structure: author: {name, url}, hooks: './hooks/hooks.json'.

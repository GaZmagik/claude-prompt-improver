---
id: learning-statusline-to-hooks-context-usage-caching
title: Statusline-to-hooks context usage caching
type: learning
scope: project
created: "2026-01-24T00:29:10.260Z"
updated: "2026-01-24T00:29:10.260Z"
tags:
  - hooks
  - context
  - caching
  - statusline
  - project
---

Statusline calculates context_window percentage but hooks receive separate stdin without context info. Pattern: statusline writes percentage to session-scoped /tmp cache file, timestamp hooks read it. Avoids duplicate transcript parsing and keeps hook logic simple.

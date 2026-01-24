---
id: decision-pluginresources-feature-incomplete-until-wiring-to-improve-promptts
title: pluginResources feature incomplete until wiring to improve-prompt.ts
type: decision
scope: project
created: "2026-01-24T13:50:39.405Z"
updated: "2026-01-24T13:50:39.405Z"
tags:
  - v1.6.0
  - wiring-gap
  - integration-bug
  - incomplete-feature
  - project
---

v1.6.0 implemented pluginResources discovery (language detection, Speckit status, plugins, MCP servers) in context-builder.ts but failed to wire it into improve-prompt.ts. Missing: hasIntegrations check, contextInput builder, hasAnyContext check, improvementContext mapping. Feature claims functionality it doesn't deliver.

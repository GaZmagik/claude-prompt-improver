---
id: gotcha-v160-pluginresources-feature-incomplete-wiring-gap-investigation
title: v1.6.0 pluginResources feature incomplete - wiring gap investigation
type: gotcha
scope: project
created: "2026-01-24T13:44:44.089Z"
updated: "2026-01-24T13:44:44.089Z"
tags:
  - promoted-from-think
  - project
---

# v1.6.0 pluginResources feature incomplete - wiring gap investigation

v1.6.0 pluginResources wiring gap: The feature was implemented in context-builder.ts but never wired into improve-prompt.ts. Four missing integration points identified: (1) hasIntegrations check doesn't include pluginResources, (2) contextInput building never adds pluginResourcesOptions, (3) hasAnyContext check ignores pluginResources, (4) improvementContext mapping exists but receives nothing. Root cause: pluginResources was treated as a config-driven toggle when it's actually discovery-driven infrastructure. Fix: unconditionally wire pluginResources into improve-prompt.ts as mandatory formatting, add integration tests that validate end-to-end flow, update docs to match actual functionality.

_Deliberation: `thought-20260124-133913888`_

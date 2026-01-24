---
id: gotcha-retro-stubbed-implementations-masquerade-as-completed-features
title: Retro - Stubbed implementations masquerade as completed features
type: gotcha
scope: project
created: "2026-01-23T20:29:43.401Z"
updated: "2026-01-24T14:01:35.671Z"
tags:
  - retrospective
  - process
  - quality
  - implementation
  - project
  - resolved
severity: high
---

LSP diagnostics was committed with a stub (returning empty array) rather than a proper implementation. The code had all the scaffolding (types, interfaces, formatting) but core functionality was incomplete. For ~2 weeks this sat in production looking complete but delivering no value. Always distinguish between 'infrastructure ready' and 'feature complete'.

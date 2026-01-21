---
id: decision-integration-wiring-single-pass
title: Single-pass integration wiring for hook flow
type: decision
scope: project
created: "2026-01-21T13:52:27.151Z"
updated: "2026-01-21T13:52:27.151Z"
tags:
  - integration
  - architecture
  - hook-design
  - project
---

Wired all 5 orphaned integrations (git, lsp, spec, memory, session) into single-pass hook flow via config → processPrompt → buildImprovementContext → buildContext. Avoids redundant parsing and keeps integration logic centralised.

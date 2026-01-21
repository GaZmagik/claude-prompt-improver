---
id: learning-retro-config-driven-integration-wiring-eliminated-need-for-classification-layer
title: Retro - Config-driven integration wiring eliminated need for classification layer
type: learning
scope: project
created: "2026-01-21T13:52:37.015Z"
updated: "2026-01-21T13:52:37.015Z"
tags:
  - retrospective
  - architecture
  - config
  - project
severity: medium
---

By moving integration toggles into config (integrations.git, integrations.lsp, etc.) rather than classification-based model selection, achieved simpler single-call architecture. Config governs which integrations are enabled; single improverModel parameter used for all improvements. This design avoided 4-9s latency penalty of 2-API-call classification approach. Lesson: pushing decisions into config can be more elegant than runtime logic branches.

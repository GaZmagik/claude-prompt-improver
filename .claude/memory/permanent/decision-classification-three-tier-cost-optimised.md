---
id: decision-classification-three-tier-cost-optimised
title: Three-tier classification with cost optimisation
type: decision
scope: project
created: "2026-01-19T07:39:33.390Z"
updated: "2026-01-19T07:39:33.390Z"
tags:
  - architecture
  - classification
  - cost-optimisation
  - prompt-improver
  - project
---

Implemented NONE → SIMPLE → COMPLEX classification with early exit for NONE (30-40% of prompts). Uses Haiku for SIMPLE (cost-effective), Sonnet for COMPLEX (better quality). Rationale: Most prompts need no improvement; early bypass saves 60-70% of improvement requests. Tier selection by keyword matching prevents unnecessary LLM calls.

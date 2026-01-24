---
id: learning-retro-multi-agent-deliberation-reveals-architectural-issues-unit-analysis-misses
title: Retro - Multi-agent deliberation reveals architectural issues unit analysis misses
type: learning
scope: project
created: "2026-01-24T13:50:35.830Z"
updated: "2026-01-24T13:50:35.830Z"
tags:
  - retrospective
  - process
  - multi-agent-analysis
  - architecture
  - project
severity: high
---

When investigating the v1.6.0 pluginResources wiring gap, using 7 domain-specific agents (typescript-expert, code-quality-expert, test-quality-expert, documentation-accuracy-expert, security-code-expert, nodejs-expert) and counter-arguments exposed that the problem wasn't just a missing 6-line fix, but a fundamental architectural mismatch: pluginResources was treated as a config-driven toggle when it's discovery-driven infrastructure. Single-agent analysis would have recommended a simple wiring fix and missed the deeper design inconsistency. Counter-arguments (especially from code-quality-expert) were essential for understanding why the feature shipped broken.

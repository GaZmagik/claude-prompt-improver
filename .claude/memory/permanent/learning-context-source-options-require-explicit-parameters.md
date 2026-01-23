---
id: learning-context-source-options-require-explicit-parameters
title: context-source-options-require-explicit-parameters
type: learning
scope: project
created: "2026-01-23T20:29:58.225Z"
updated: "2026-01-23T20:29:58.225Z"
tags:
  - context-injection
  - architecture
  - bug-pattern
  - project
---

Dynamic discovery gatherers (spec, session, dynamicDiscovery, lsp) failed to produce output because buildImprovementContext wasn't passing required parameters (especially 'prompt') in options. Each gatherer needs its input configured: dynamicDiscovery needs prompt for keyword matching, spec needs featurePath, etc. Verify options construction, not just enablement flags.

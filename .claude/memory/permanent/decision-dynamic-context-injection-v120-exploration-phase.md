---
id: decision-dynamic-context-injection-v120-exploration-phase
title: Dynamic Context Injection v1.2.0 - Exploration Phase
type: decision
scope: project
created: "2026-01-21T19:56:47.937Z"
updated: "2026-01-21T19:56:47.937Z"
tags:
  - promoted-from-think
  - project
---

# Dynamic Context Injection v1.2.0 - Exploration Phase

Exploration conclusion - Key architectural decisions:

1. FILESYSTEM SCANNING: Use Node.js fs.readdir({ recursive: true, withFileTypes: true }) for efficient directory traversal
2. CACHING: Implement LRU cache with mtime validation (pattern from spec-awareness.ts)
3. PARSING: Reuse existing parseFrontmatter() for YAML (no new dependencies, follows P5 Simplicity)
4. INTEGRATION POINT: Create new integrations/dynamic-discovery.ts following established integration pattern
5. SPECIAL CASE: Detect 'memory think' in prompt, inject available --agent and --style suggestions

OPEN QUESTIONS for /speckit:specify:
- File format confirmation for skills, commands, output-styles
- Plugin directory nested discovery depth
- Whether to include commands in initial scope
- Performance impact of scanning on every prompt

Next step: Generate specify and plan prompts

_Deliberation: `thought-20260121-195531569`_

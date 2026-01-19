---
id: learning-retro-architectural-fix-eliminated-entire-class-of-complexity
title: Retro - Architectural fix eliminated entire class of complexity
type: learning
scope: project
created: "2026-01-19T22:08:17.323Z"
updated: "2026-01-19T22:08:17.323Z"
tags:
  - retrospective
  - architecture
  - simplicity
  - project
severity: high
---

Original design used --fork-session to access parent session during prompt improvement. Removing this entirely (since prompt improvement doesn't need conversation history) made the code simpler, faster, and actually functional. The fix: `claude --print --model <model> "<prompt>"` with no session access. Lesson: simpler architectures are usually better. When you hit a circular dependency, ask if you even need that dependency.

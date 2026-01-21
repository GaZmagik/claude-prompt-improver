---
id: decision-restore-nonesimplecomplex-classification-per-original-spec
title: Restore NONE/SIMPLE/COMPLEX classification per original spec
type: decision
scope: project
created: "2026-01-21T13:25:18.948Z"
updated: "2026-01-21T13:25:18.948Z"
tags:
  - prompt-improver
  - classification
  - architecture
  - decision
  - project
---

Reversing decision-prompt-improver-always-improve-no-classification. User testing revealed that 'always improve' produces unwanted mutations of already well-structured prompts (e.g., clear request expanded into numbered list). Restoring classification: NONE=passthrough, SIMPLE=Haiku, COMPLEX=Sonnet. The original spec (research.md Decision 1) correctly rejected 'Alternative C: Skip Classification' for this exact reason.

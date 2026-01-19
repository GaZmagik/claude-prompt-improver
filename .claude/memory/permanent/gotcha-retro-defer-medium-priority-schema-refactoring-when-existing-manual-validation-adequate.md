---
id: gotcha-retro-defer-medium-priority-schema-refactoring-when-existing-manual-validation-adequate
title: Retro - Defer medium-priority schema refactoring when existing manual validation adequate
type: gotcha
scope: project
created: "2026-01-19T23:06:20.182Z"
updated: "2026-01-19T23:06:20.182Z"
tags:
  - retrospective
  - process
  - validation
  - scope-creep
  - project
severity: low
---

Investigated adding Zod schema validation for context_usage (marked MEDIUM priority) but discovered existing manual validation in parseContextUsage() was already comprehensive and correct. Spent ~15 mins investigating when the correct action was to mark task as 'deferred - manual validation sufficient' immediately. Pattern: before implementing validation refactors, check if manual version already exists and is working.

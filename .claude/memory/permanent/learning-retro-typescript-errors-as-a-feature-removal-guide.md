---
id: learning-retro-typescript-errors-as-a-feature-removal-guide
title: Retro - TypeScript errors as a feature removal guide
type: learning
scope: project
created: "2026-01-19T21:12:03.448Z"
updated: "2026-01-19T21:12:03.448Z"
tags:
  - retrospective
  - process
  - refactoring
  - project
severity: medium
---

When removing a major feature (like classification), leave the type definitions in place initially but remove usage. TypeScript errors then become a checklist of all the places you need to update. More reliable than grep + manual fixes. Removed 9-14s classification latency by using tsc output as a roadmap.

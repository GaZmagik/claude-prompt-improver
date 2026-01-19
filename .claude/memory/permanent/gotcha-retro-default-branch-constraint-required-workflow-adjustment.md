---
id: gotcha-retro-default-branch-constraint-required-workflow-adjustment
title: Retro - Default branch constraint required workflow adjustment
type: gotcha
scope: project
created: "2026-01-19T09:40:02.383Z"
updated: "2026-01-19T09:40:02.383Z"
tags:
  - retrospective
  - process
  - git
  - project
severity: medium
---

Feature branch was set as default branch on GitHub, blocking deletion. Had to change default to main before removing feature branch. Future: verify default branch is main before starting feature branches, or set it immediately after repo creation.

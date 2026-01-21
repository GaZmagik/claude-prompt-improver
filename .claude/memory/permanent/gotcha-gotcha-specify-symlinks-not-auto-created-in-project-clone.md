---
id: gotcha-gotcha-specify-symlinks-not-auto-created-in-project-clone
title: Gotcha - Specify symlinks not auto-created in project clone
type: gotcha
scope: project
created: "2026-01-21T14:14:54.298Z"
updated: "2026-01-21T14:14:54.298Z"
tags:
  - retrospective
  - process
  - setup
  - gotcha
  - project
severity: low
---

When /speckit:review ran, `.specify/` existed but was missing symlinks to `~/.specify/templates/`, `docs/`, `scripts/`, and .md files. These had to be manually created. Prevention: Add symlink setup to project README or include as part of initial setup script. The symlinks should be created when `.specify/` directory is first created.

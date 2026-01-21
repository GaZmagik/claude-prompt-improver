---
id: artifact-hook-auto-setup-pattern
title: Hook auto-setup from bundled template
type: artifact
scope: project
created: "2026-01-21T13:52:37.473Z"
updated: "2026-01-21T13:52:37.473Z"
tags:
  - hook-design
  - user-experience
  - configuration
  - pattern
  - project
---

Hook checks for local.md or example.md on every run. If neither exists, creates example.md from bundled template (hooks/templates/). Informs user via systemMessage to copy and customise. Enables zero-config UX for new users.

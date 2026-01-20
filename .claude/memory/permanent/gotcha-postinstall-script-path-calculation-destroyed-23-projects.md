---
id: gotcha-postinstall-script-path-calculation-destroyed-23-projects
title: Postinstall script path calculation destroyed 23 projects
type: gotcha
scope: project
created: "2026-01-20T11:53:19.057Z"
updated: "2026-01-20T11:53:19.057Z"
tags:
  - project
---

Postinstall scripts using dirname(import.meta.url) to calculate paths will fail catastrophically when run outside their intended directory. The cleanup script calculated installPath=/home/gareth/.vs instead of ~/.claude/plugins/cache/enhance/, then deleted all 23 sibling projects thinking they were old versions. Never use relative path calculations in destructive operations without explicit validation.

---
id: learning-retro-comparing-working-vs-broken-implementations-accelerated-debugging
title: Retro - Comparing working vs broken implementations accelerated debugging
type: learning
scope: project
created: "2026-01-22T13:42:01.059Z"
updated: "2026-01-22T13:42:01.059Z"
tags:
  - retrospective
  - process
  - debugging
  - comparison
  - project
severity: medium
---

When fork-session failed in v1.3.1, finding the old working shell script in ~/.claude/hooks/archive was the breakthrough. Comparing exact command patterns revealed --output-format json was added but --debug was missing. When debugging unfamiliar code, always search for prior working implementations to compare patterns.

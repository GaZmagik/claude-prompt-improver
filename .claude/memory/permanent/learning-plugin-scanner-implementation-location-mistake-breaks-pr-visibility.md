---
id: learning-plugin-scanner-implementation-location-mistake-breaks-pr-visibility
title: Plugin scanner implementation location mistake breaks PR visibility
type: learning
scope: project
created: "2026-01-24T11:13:58.405Z"
updated: "2026-01-24T11:13:58.405Z"
tags:
  - hooks
  - project-structure
  - pr-process
  - project
---

Implemented plugin-scanner.ts in ~/.claude/hooks/ts/lib/ (global hooks installation) instead of hooks/src/integrations/ (project source). Code worked but PR appeared empty to reviewer. Lesson: Always verify module target directory matches project structure before writing implementation.

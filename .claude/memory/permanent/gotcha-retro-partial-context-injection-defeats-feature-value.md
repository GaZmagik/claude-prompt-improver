---
id: gotcha-retro-partial-context-injection-defeats-feature-value
title: Retro - Partial context injection defeats feature value
type: gotcha
scope: project
created: "2026-01-23T20:29:48.319Z"
updated: "2026-01-23T20:29:48.319Z"
tags:
  - retrospective
  - process
  - testing
  - integration
  - project
severity: medium
---

Dynamic discovery gathered matched skills, commands, and output styles but formatDynamicContext() only formatted agents - the rest were silently discarded. The feature worked but delivered incomplete value. All infrastructure was there; it just wasn't wired completely. Lesson: integration tests should verify entire data flow, not just individual components.

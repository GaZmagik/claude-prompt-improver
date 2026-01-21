---
id: gotcha-hook-xml-structure-consistency-optional-vs-mandatory
title: Hook XML Structure Consistency - Optional vs Mandatory
type: gotcha
scope: project
created: "2026-01-21T18:51:28.388Z"
updated: "2026-01-21T18:51:28.388Z"
tags:
  - hooks
  - prompting
  - xml
  - consistency
  - debugging
  - project
---

Improver prompt instruction 'ADD structure... if helpful' caused inconsistent XML output from Claude - sometimes present, sometimes absent. Fixed by making XML structure mandatory in the system prompt. Ensures consistent systemMessage output for debugging and predictable user experience.

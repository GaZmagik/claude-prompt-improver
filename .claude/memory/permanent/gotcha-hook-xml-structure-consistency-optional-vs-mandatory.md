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

**UPDATE (2026-07-15, v1.9.0):** Deliberately reversed. Mandatory XML was the right fix for 2025-era model compliance, but the underlying problem was vague instruction ("if helpful"), not the absence of XML. v1.9.0 replaces mandatory XML with a prescriptive prose shape (goal first, scope, numbered questions, explicit deliverable) at Gareth's explicit request; output consistency was live-verified through haiku. XML is retained only for delimiting injected data in the metaprompt.

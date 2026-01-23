---
id: learning-dynamic-discovery-partial-formatting-bug
title: dynamic-discovery-partial-formatting-bug
type: learning
scope: project
created: "2026-01-23T20:29:46.680Z"
updated: "2026-01-23T20:29:46.680Z"
tags:
  - dynamic-discovery
  - formatting
  - bug-fix
  - project
---

formatDynamicContext() only formatted matched agents and ignored matched skills, commands, and output styles. Fixed by adding formatSkillSuggestions, formatCommandSuggestions, and formatOutputStyleSuggestions functions to complete context injection.

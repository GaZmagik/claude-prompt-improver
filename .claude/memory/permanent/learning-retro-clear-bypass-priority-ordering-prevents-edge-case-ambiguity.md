---
id: learning-retro-clear-bypass-priority-ordering-prevents-edge-case-ambiguity
title: Retro - Clear bypass priority ordering prevents edge case ambiguity
type: learning
scope: project
created: "2026-01-19T04:41:55.547Z"
updated: "2026-01-19T04:41:55.547Z"
tags:
  - retrospective
  - process
  - design
  - project
severity: medium
---

Establishing explicit priority order for bypass conditions (plugin_disabled > forked_session > low_context > skip_tag > short_prompt) prevented design ambiguity and made tests deterministic. When multiple conditions matched, first-match-wins semantics were unambiguous. Applied to bypass detector (T060) and immediately validated with comprehensive test suite.

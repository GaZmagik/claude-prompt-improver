---
id: learning-retro-verify-api-contracts-before-implementing-workarounds
title: Verify API contracts before implementing workarounds
type: learning
scope: project
created: "2026-01-22T19:59:03.422Z"
updated: "2026-01-22T19:59:03.422Z"
tags:
  - retrospective
  - api-integration
  - process
  - project
severity: medium
---

The low_context bypass was built assuming Claude Code provides context_usage to UserPromptSubmit hooks. It doesn't. Checking official documentation first (rather than after investigation) would have caught this and led directly to the transcript-based solution without the false assumption phase.

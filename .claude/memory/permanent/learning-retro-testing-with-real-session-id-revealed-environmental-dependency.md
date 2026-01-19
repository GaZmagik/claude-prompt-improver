---
id: learning-retro-testing-with-real-session-id-revealed-environmental-dependency
title: Retro - Testing with real session ID revealed environmental dependency
type: learning
scope: project
created: "2026-01-19T22:08:11.568Z"
updated: "2026-01-19T22:08:11.568Z"
tags:
  - retrospective
  - process
  - testing
  - hooks
  - project
severity: medium
---

Plugin passed all unit tests but failed in manual testing when trying to use old session IDs. Only when testing with actual active session did the architectural flaw become apparent. This shows the importance of testing hooks in their actual execution environment (UserPromptSubmit context during conversation). Unit tests alone can't catch session lifecycle issues.

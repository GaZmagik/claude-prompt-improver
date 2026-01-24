---
id: learning-retro-end-to-end-feature-validation-catches-issues-tests-miss
title: Retro - End-to-end feature validation catches issues tests miss
type: learning
scope: project
created: "2026-01-24T13:50:51.708Z"
updated: "2026-01-24T13:50:51.708Z"
tags:
  - retrospective
  - process
  - validation
  - user-experience
  - project
severity: high
---

When you actually *used* the improved prompt output from v1.6.0 (two real user scenarios from another project), you immediately discovered that the feature didn't work: no <tools>, <skills>, <agents>, or <project-context> XML sections in the output. This couldn't have been caught by code review or unit tests because the tests never validated actual user-facing output. The lesson: for features that directly affect user experience, require validation by actually running the feature end-to-end in realistic conditions before shipping. A 30-second manual test (send a real prompt, check the output) would have caught this before PR #27 even shipped.

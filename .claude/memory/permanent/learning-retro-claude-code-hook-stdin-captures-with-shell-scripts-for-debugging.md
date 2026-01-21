---
id: learning-retro-claude-code-hook-stdin-captures-with-shell-scripts-for-debugging
title: Retro - Claude Code hook stdin captures with shell scripts for debugging
type: learning
scope: project
created: "2026-01-21T13:01:49.530Z"
updated: "2026-01-21T13:01:49.530Z"
tags:
  - retrospective
  - process
  - debugging
  - hooks
  - project
severity: medium
---

When unable to test hooks locally, create a debug shell script that logs stdin to a file. This can be added to settings.json hooks temporarily and run before the actual hook to capture the real input format Claude Code sends. This was critical for discovering the actual input structure that differed from what we expected.

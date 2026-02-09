---
id: gotcha-prompt-improver-userpromptsubmit-hook-times-out-due-to-slow-cli
title: prompt-improver-userpromptsubmit-hook-times-out-due-to-slow-cli
type: gotcha
scope: project
created: "2026-02-08T23:29:21.528Z"
updated: "2026-02-08T23:29:21.528Z"
tags:
  - prompt-improver
  - userpromptsubmit
  - timeout
  - performance
  - cli
  - project
---

UserPromptSubmit hook using 'claude --print' for prompt improvement times out because CLI commands take 30-50 seconds with haiku model, exceeding the 30s timeout. Root cause is slow API response (~50s), not context gathering (~5s). Context integrations (git, memory, pluginResources) add ~17s overhead but aren't the bottleneck.

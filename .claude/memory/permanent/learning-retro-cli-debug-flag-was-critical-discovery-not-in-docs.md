---
id: learning-retro-cli-debug-flag-was-critical-discovery-not-in-docs
title: Retro - CLI --debug flag was critical discovery not in docs
type: learning
scope: project
created: "2026-01-22T13:41:52.874Z"
updated: "2026-01-22T13:41:52.874Z"
tags:
  - retrospective
  - process
  - cli
  - debugging
  - project
severity: high
---

Discovered that claude CLI --print mode hangs without --debug flag. This was not mentioned in docs/help. Testing with --debug revealed the issue. Similar hidden flags may exist - always test with debug when hanging occurs.

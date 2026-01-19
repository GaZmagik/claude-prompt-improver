---
id: decision-git-command-array-based-arguments
title: Refactor executeGitCommand to use array-based arguments instead of string splitting
type: decision
scope: project
created: "2026-01-19T23:06:25.445Z"
updated: "2026-01-19T23:06:25.445Z"
tags:
  - security
  - command-injection-prevention
  - git-integration
  - refactoring
  - project
---

Changed git-context.ts executeGitCommand() signature from accepting command string with space-split parsing to accepting string[] args. Prevents command injection via untrusted input. All 33 git-context tests passing, 614 total tests passing.

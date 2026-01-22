---
id: learning-userpromptsubmit-hook-additionalcontext-must-be-wrapped-in-hookspecificoutput
title: userpromptsubmit hook additionalcontext must be wrapped in hookspecificoutput
type: learning
scope: project
created: "2026-01-22T13:42:07.034Z"
updated: "2026-01-22T13:42:07.034Z"
tags:
  - hooks
  - additionalContext
  - hookSpecificOutput
  - output-format
  - project
---

Hook output format requires additionalContext to be nested inside hookSpecificOutput object per Claude Code documentation. Top-level additionalContext is ignored by the CLI. This prevented prompt improver enhancements from reaching Claude even though they were shown to the user.

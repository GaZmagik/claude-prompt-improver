---
id: learning-hook-test-format-flat-sessionid-vs-nested-context
title: "Hook test format: flat session_id vs nested context"
type: learning
scope: project
created: "2026-01-21T13:52:38.064Z"
updated: "2026-01-21T13:52:38.064Z"
tags:
  - testing
  - hooks
  - json-format
  - bug-fix
  - project
---

Claude Code hook input uses flat JSON (session_id at root level), not nested (context.session_id). Tests were using nested format causing parser mismatches. Updated 4 test files to use flat format. Pre-existing bug that blocking test suite.

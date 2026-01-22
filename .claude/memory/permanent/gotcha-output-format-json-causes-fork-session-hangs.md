---
id: gotcha-output-format-json-causes-fork-session-hangs
title: output-format json causes fork-session hangs
type: gotcha
scope: project
created: "2026-01-22T13:42:18.117Z"
updated: "2026-01-22T13:42:18.117Z"
tags:
  - fork-session
  - output-format
  - json
  - gotcha
  - project
---

Adding --output-format json to fork-session commands causes indefinite hangs even with --debug flag. Old shell script worked because it had no timeout and graceful fallback. The fix is plain text output + manual parsing, not JSON format.

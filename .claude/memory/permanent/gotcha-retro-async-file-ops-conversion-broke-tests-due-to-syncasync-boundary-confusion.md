---
id: gotcha-retro-async-file-ops-conversion-broke-tests-due-to-syncasync-boundary-confusion
title: Retro - Async file ops conversion broke tests due to sync/async boundary confusion
type: gotcha
scope: project
created: "2026-01-21T18:51:03.729Z"
updated: "2026-01-21T18:51:03.729Z"
tags:
  - retrospective
  - testing
  - async-patterns
  - project
severity: medium
---

Converting memory-plugin.ts to async file operations (readFileAsync, pathExistsAsync) broke 3 tests in integration.spec.ts because test assertions weren't updated to await the async function. Pattern: integration.spec.ts didn't add 'async' to test functions, so promises weren't awaited. Solution: Always add 'async' to test functions when calling async code. Check for '.then()' or 'await' requirements in all specs.

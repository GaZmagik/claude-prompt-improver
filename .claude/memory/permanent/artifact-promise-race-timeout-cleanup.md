---
id: artifact-promise-race-timeout-cleanup
title: Promise.race timeout cleanup pattern
type: artifact
scope: project
created: "2026-01-19T18:16:17.195Z"
updated: "2026-01-19T18:16:17.195Z"
tags:
  - async
  - patterns
  - typescript
  - cleanup
  - resource-management
  - project
---

Verified pattern used in 3 locations (git-context.ts:92, claude-client.ts:99, claude-client.ts:137): Create timeoutPromise with setTimeout, race against actual promise, always clearTimeout in finally block. Prevents resource leaks and ensures timeout IDs don't accumulate.

---
id: learning-postinstall-scripts-must-validate-paths-before-destructive-operations
title: Postinstall scripts must validate paths before destructive operations
type: learning
scope: project
created: "2026-01-20T11:53:22.822Z"
updated: "2026-01-20T11:53:22.822Z"
tags:
  - project
---

Never use relative path calculations (dirname, import.meta.url) in postinstall scripts without explicit validation. The script should verify it's running in the expected directory and validate the target path before any file deletions. Consider using environment variables set by the package manager, or requiring explicit user configuration.

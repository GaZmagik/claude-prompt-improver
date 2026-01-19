---
id: learning-bun-typescript-requires-allowimportingtsextensions-for-ts-imports
title: Bun TypeScript requires allowImportingTsExtensions for .ts imports
type: learning
scope: project
created: "2026-01-19T01:10:45.429Z"
updated: "2026-01-19T01:10:45.429Z"
tags:
  - bun
  - typescript
  - configuration
  - build-setup
  - project
---

When using Bun with TypeScript in strict mode, tsconfig.json must include 'allowImportingTsExtensions: true' to allow importing modules with .ts extensions. This is required by bun.json module resolution.

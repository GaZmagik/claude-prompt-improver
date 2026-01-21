---
id: learning-bundled-template-path-resolution-requires-relative-traversal-from-srccore
title: Bundled template path resolution requires relative traversal from src/core
type: learning
scope: project
created: "2026-01-21T14:14:52.108Z"
updated: "2026-01-21T14:14:52.108Z"
tags:
  - config-loader
  - bundled-templates
  - path-resolution
  - project
---

BUNDLED_TEMPLATE_PATH must use ../../templates/ from src/core/config-loader.ts, not ../templates/. The import location determines the base directory for relative path resolution. This affected ensureConfigSetup() template loading.

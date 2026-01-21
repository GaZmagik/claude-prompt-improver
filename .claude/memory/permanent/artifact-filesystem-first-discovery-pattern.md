---
id: artifact-filesystem-first-discovery-pattern
title: Filesystem-First Discovery Pattern for CLI Plugins
type: artifact
scope: project
created: "2026-01-21T21:19:54.475Z"
updated: "2026-01-21T21:19:54.475Z"
tags:
  - discovery
  - filesystem
  - pattern
  - reusable
  - project
---

Scan ~/.claude/{agents/specialist,commands,skills/*,output-styles} directories for .md files with YAML frontmatter. Extract metadata (name, description, version). Validate paths to prevent traversal attacks. Cache with mtime validation for performance.

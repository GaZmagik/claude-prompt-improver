---
id: learning-config-redesign-markdown-yaml-frontmatter
title: Config redesign markdown YAML frontmatter
type: learning
scope: project
created: "2026-01-19T09:39:52.893Z"
updated: "2026-01-19T09:39:52.893Z"
tags:
  - configuration
  - design-pattern
  - yaml
  - plugin
  - plugin-development
  - project
---

Claude Prompt Improver switched config from JSON to markdown with YAML frontmatter (.local.md format). Provides better readability and optional configuration - defaults work out-of-box. Implementation uses parseYamlFrontmatter() parser with backwards-compatible JSON fallback. Supports both camelCase and snake_case keys.

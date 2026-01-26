---
id: learning-custom-component-paths-should-supplement-defaults-not-replace
title: Custom component paths should supplement defaults, not replace
type: learning
scope: project
created: "2026-01-24T19:02:09.299Z"
updated: "2026-01-24T19:02:09.299Z"
tags:
  - plugins
  - design
  - component-discovery
  - project
---

Initial implementation of normaliseComponentPaths returned custom paths OR defaults. Review feedback identified this violates principle of least surprise—users expect custom paths to extend discovery, not override it. Changed to merge both lists (deduplicated). Pattern: when adding customisation options to discovery systems, supplement by default.

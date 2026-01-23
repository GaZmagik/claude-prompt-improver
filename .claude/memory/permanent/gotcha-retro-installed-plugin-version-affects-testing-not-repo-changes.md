---
id: gotcha-retro-installed-plugin-version-affects-testing-not-repo-changes
title: Retro - Installed plugin version affects testing, not repo changes
type: gotcha
scope: project
created: "2026-01-22T19:55:32.985Z"
updated: "2026-01-22T19:55:32.985Z"
tags:
  - retrospective
  - process
  - plugins
  - testing
  - project
severity: medium
---

Attempted to debug stdin data by adding logging to the repo, but the running hook is from the installed plugin (v1.4.0 in ~/.claude/plugins/cache/). Changes to the repo don't affect runtime until the plugin is reinstalled or published. For testing hooks: either test against the installed version directly, or remember that repo changes won't be visible until rebuild/reinstall. Saved time by merging early and validating against the actual installed code.

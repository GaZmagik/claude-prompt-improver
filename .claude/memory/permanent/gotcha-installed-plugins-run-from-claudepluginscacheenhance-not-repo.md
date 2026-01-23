---
id: gotcha-installed-plugins-run-from-claudepluginscacheenhance-not-repo
title: Installed plugins run from ~/.claude/plugins/cache/enhance/ not repo
type: gotcha
scope: project
created: "2026-01-22T19:55:59.370Z"
updated: "2026-01-22T19:55:59.370Z"
tags:
  - hooks
  - plugins
  - testing
  - installation
  - project
---

When testing hook changes, the running plugin is from ~/.claude/plugins/cache/enhance/<plugin>/<version>/, not the local repo. Local changes don't take effect until plugin is reinstalled or version bumped. For quick testing, modify the installed plugin directly or use local plugin linking.

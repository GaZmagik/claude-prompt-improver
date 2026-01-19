---
id: gotcha-retro-avoid-regex-sed-on-test-files-during-refactoring
title: Retro - Avoid regex sed on test files during refactoring
type: gotcha
scope: project
created: "2026-01-19T21:12:08.067Z"
updated: "2026-01-19T21:12:08.067Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: high
---

Attempted sed -i 's/improvePrompt({$/improvePrompt({\nconfig: mockConfig,/g' on test files. This broke syntax by removing function calls mid-statement. Manual edits or more targeted replacements are safer. Test files have complex nested structures that don't respond well to line-based regex.

---
id: learning-retro-pr-already-existed-edit-approach-was-more-efficient-than-recreate
title: Retro - PR already existed, edit approach was more efficient than recreate
type: learning
scope: project
created: "2026-01-19T19:27:48.615Z"
updated: "2026-01-19T19:27:48.615Z"
tags:
  - retrospective
  - process
  - github-workflow
  - project
severity: low
---

When attempting to create PR #7, gh pr create returned error: PR already exists. Rather than deleting and recreating, used 'gh pr edit 7' to update the body with comprehensive new description. This preserved PR number, existing checks (already passing), and CI history. Single 'gh pr edit' call << creating new PR. Lesson: Check if PR exists before creating; editing existing PR preserves workflow state.

---
id: decision-changelog-test-count-should-reflect-actual-new-tests-not-total-tests-in-modified-files
title: CHANGELOG test count should reflect actual new tests, not total tests in modified files
type: decision
scope: project
created: "2026-01-24T13:50:50.234Z"
updated: "2026-01-24T13:50:50.234Z"
tags:
  - changelog
  - test-counting
  - release-process
  - accuracy
  - project
---

v1.6.0 CHANGELOG initially claimed 87 new tests (all tests in modified files) when only 40 were actually added. Corrected to 40. When calculating test additions, count only NEW tests added in the PR, not all tests in files that were modified.

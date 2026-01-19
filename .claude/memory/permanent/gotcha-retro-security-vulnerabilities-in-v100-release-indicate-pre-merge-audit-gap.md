---
id: gotcha-retro-security-vulnerabilities-in-v100-release-indicate-pre-merge-audit-gap
title: Retro - Security vulnerabilities in v1.0.0 release indicate pre-merge audit gap
type: gotcha
scope: project
created: "2026-01-19T10:04:48.656Z"
updated: "2026-01-19T10:04:48.656Z"
tags:
  - retrospective
  - process
  - security
  - ci
  - workflow
  - project
severity: critical
---

Feature PR #1 (v1.0.0) was merged with 2 critical security issues: command injection in session-context.ts (shell metacharacters not escaped), and prompt injection (XML escaping function exists but unused in templates). These were caught during post-merge review, not pre-merge. Pattern: Add security expert review as mandatory pre-merge gate for hooks/services. Current: review happens after merge. Should be: security audit → fix → merge. This delayed critical fixes by requiring additional PR.

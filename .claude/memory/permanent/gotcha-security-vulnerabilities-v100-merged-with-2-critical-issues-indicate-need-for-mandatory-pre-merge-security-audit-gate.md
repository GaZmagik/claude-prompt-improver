---
id: gotcha-security-vulnerabilities-v100-merged-with-2-critical-issues-indicate-need-for-mandatory-pre-merge-security-audit-gate
title: Security vulnerabilities (v1.0.0 merged with 2 critical issues) indicate need for mandatory pre-merge security audit gate
type: gotcha
scope: project
created: "2026-01-19T23:06:13.806Z"
updated: "2026-01-19T23:06:13.806Z"
tags:
  - security
  - gate-requirement
  - pre-merge-validation
  - always-improve
  - project
severity: critical
---

Project history shows v1.0.0 merged with 2 critical security issues (command injection, prompt injection) that were caught post-merge. This session added comprehensive security review as mandatory pre-PR gate. Always-Improve now requires security review completion before PR creation.

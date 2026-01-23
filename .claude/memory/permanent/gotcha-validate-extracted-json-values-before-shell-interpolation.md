---
id: gotcha-validate-extracted-json-values-before-shell-interpolation
title: Validate extracted JSON values before shell interpolation
type: gotcha
scope: project
created: "2026-01-22T19:59:02.909Z"
updated: "2026-01-22T19:59:02.909Z"
tags:
  - retrospective
  - security
  - github-actions
  - process
  - project
severity: high
---

PR #21 used unsafe pattern: awk "BEGIN {exit !($CONFIDENCE >= 0.7)}" where $CONFIDENCE comes from JSON extraction. While data source (Claude) is trusted, this is command injection-vulnerable. Pattern: Always use jq for comparisons (jq can evaluate conditions) or validate/quote variables before shell use. Never interpolate untrusted/semi-trusted data into command expressions.

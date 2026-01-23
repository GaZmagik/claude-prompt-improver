---
id: gotcha-command-injection-risk-with-unquoted-variables-in-awk-expressions
title: Command injection risk with unquoted variables in awk expressions
type: gotcha
scope: project
created: "2026-01-22T19:59:02.350Z"
updated: "2026-01-22T19:59:02.350Z"
tags:
  - security
  - bash
  - workflow
  - command-injection
  - project
---

Never interpolate variables directly into awk expressions without quoting. Example: awk "BEGIN {exit !($CONFIDENCE >= 0.7)}" is vulnerable if $CONFIDENCE contains shell metacharacters. Instead: awk -v conf="$CONFIDENCE" 'BEGIN {exit !(conf >= 0.7)}' or similar quoted approach.

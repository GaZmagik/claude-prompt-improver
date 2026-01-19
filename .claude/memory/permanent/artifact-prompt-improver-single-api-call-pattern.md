---
id: artifact-prompt-improver-single-api-call-pattern
title: prompt-improver-single-api-call-pattern
type: artifact
scope: project
created: "2026-01-19T20:44:18.983Z"
updated: "2026-01-19T20:44:18.983Z"
tags:
  - prompt-improver
  - optimization
  - api
  - project
---

Combine classification+improvement into single Claude API call instead of sequential calls. Saves 4-9 seconds latency (9-14s → 5-10s) and halves API costs. Single prompt to Claude does both tasks: 'Classify and improve this prompt.' with format: CLASSIFICATION: [reason] IMPROVED_PROMPT: [text]

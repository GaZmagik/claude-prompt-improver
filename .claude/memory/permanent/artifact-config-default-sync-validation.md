---
id: artifact-config-default-sync-validation
title: Ensure example config defaults match actual code defaults
type: artifact
scope: project
created: "2026-01-21T14:15:13.540Z"
updated: "2026-01-21T14:15:13.540Z"
tags:
  - config
  - defaults
  - validation
  - project
---

Validate all example configuration files have correct default values matching the actual implementation. Found useTimestampedLogs: true in example but defaults to false in code. This prevents user confusion and support burden.

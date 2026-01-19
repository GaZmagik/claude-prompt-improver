---
id: artifact-conditional-property-inclusion-pattern-for-exactoptionalpropertytypes
title: Conditional property inclusion pattern for exactOptionalPropertyTypes
type: artifact
scope: project
created: "2026-01-19T11:38:13.124Z"
updated: "2026-01-19T11:38:13.124Z"
tags:
  - project
---

When TypeScript's exactOptionalPropertyTypes is enabled, build objects conditionally by checking property values before including them. Use pattern: const result = { ...base, ...(value !== undefined && { key: value }) } to avoid readonly property conflicts and satisfy strict type checking.

---
id: learning-retro-systematic-file-type-enumeration-accelerates-recovery
title: Retro - Systematic file type enumeration accelerates recovery
type: learning
scope: project
created: "2026-01-20T14:38:41.481Z"
updated: "2026-01-20T14:38:41.481Z"
tags:
  - retrospective
  - recovery
  - process
  - photorec
  - project
severity: high
---

When dealing with large recovery operations, enumerate ALL file types available early (e.g., 808k text files) before narrowing scope. Initial recovery focused only on coverage HTML, missing 376 memory files and 361 spec files until late in process. Future recovery attempts should: (1) Run find to count files by extension first, (2) Prioritize by business value (memory > specs > coverage), (3) Extract largest categories in parallel when possible.

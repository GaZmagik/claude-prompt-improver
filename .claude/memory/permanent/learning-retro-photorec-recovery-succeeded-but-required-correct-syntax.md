---
id: learning-retro-photorec-recovery-succeeded-but-required-correct-syntax
title: Retro - PhotoRec recovery succeeded but required correct syntax
type: learning
scope: project
created: "2026-01-20T11:53:20.096Z"
updated: "2026-01-20T11:53:20.096Z"
tags:
  - retrospective
  - recovery
  - photorec
  - learning
  - process
  - project
severity: medium
---

PhotoRec command with incorrect syntax (/cmd /dev/sda2 partition_none,search,...) appears to succeed but never runs - was silently ignored. Lost 1.5 hours of recovery time because script exited 0 despite doing nothing. Correct syntax is simpler: photorec /d ~/recovery-temp /cmd /dev/sda2 search. The recovery DID work - recovered 418 new-directions files despite 359GB of disk writes after deletion. This shows ext4 recovery is still possible even after significant disk activity if proper tools and syntax are used.

---
id: learning-anthropic-sdk-direct-api-faster-than-cli
title: anthropic-sdk-direct-api-faster-than-cli
type: learning
scope: project
created: "2026-02-08T23:29:28.439Z"
updated: "2026-02-08T23:29:28.439Z"
tags:
  - anthropic-sdk
  - performance
  - api
  - prompt-improver
  - optimization
  - project
---

Using Anthropic SDK Messages API directly is 2-5 seconds vs 30-50 seconds via CLI. CLI spawning overhead and potential session baggage makes it unsuitable for synchronous hooks. UserPromptSubmit hooks need <5s latency to be usable; CLI approaches will always timeout.

---
id: decision-scanner-module-design-patterns-strategy-builder-template-method
title: Scanner module design patterns - Strategy, Builder, Template Method
type: decision
scope: project
created: "2026-01-24T12:17:11.159Z"
updated: "2026-01-24T12:17:11.159Z"
tags:
  - design-patterns
  - architecture
  - extensibility
  - plugin-scanner
  - project
---

The plugin-scanner implementation demonstrates effective use of design patterns:

1. **Strategy Pattern**: Multiple language detection strategies via LANGUAGE_INDICATORS array - easy to add new languages
2. **Builder Pattern**: ResourceContext construction via gatherResourceContext() - separates gathering from formatting
3. **Template Method**: Consistent scanner functions (scanPluginSkills, scanPluginAgents, scanPluginCommands) - same structure, different details

These patterns enable extensibility without modifying core logic.

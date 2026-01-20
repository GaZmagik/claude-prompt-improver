---
id: gotcha-postinstall-script-path-calculation-caused-catastrophic-deletion
title: Postinstall script path calculation caused catastrophic deletion
type: gotcha
scope: project
created: "2026-01-20T08:10:20.763Z"
updated: "2026-01-20T08:10:20.763Z"
tags:
  - catastrophic
  - postinstall
  - path-calculation
  - rmSync
  - file-deletion
  - critical
  - gotcha
  - plugin-development
  - project
---

CRITICAL DISASTER: Postinstall cleanup script deleted 23 projects from /home/gareth/.vs/

ROOT CAUSE:
The cleanup-old-versions.ts script calculated paths incorrectly when run during development:

Expected (plugin installation):
  scriptDir = ~/.claude/plugins/cache/enhance/claude-prompt-improver/1.1.3/scripts/
  installPath = ~/.claude/plugins/cache/enhance/claude-prompt-improver/1.1.3/
  pluginCacheParent = ~/.claude/plugins/cache/enhance/claude-prompt-improver/

Actual (dev environment when 'bun add' triggered postinstall):
  scriptDir = /home/gareth/.vs/claude-prompt-improver/scripts/
  installPath = /home/gareth/.vs/claude-prompt-improver/
  pluginCacheParent = /home/gareth/.vs/  ❌ DISASTER

The script then executed rmSync() on everything in .vs/ except 'claude-prompt-improver', thinking they were old plugin versions.

LOST PROJECTS (23 total):
- new-directions (WORK PROJECT - highest priority)
- claude-memory-plugin (plugin development)
- enhance (plugin cache)
- MS-DOS, specs, shipdos, nova, hyperliquid-mcp, coinbase-mcp, binance-mcp, meta, hyperliquid-ml, edit, scientific-calculator-mcp, coinbase-chart, and 10 more

ALSO LOST:
- Uncommitted branch 'fix/hook-output-format' with all hook output format fixes (commit 01ac16e, never pushed)

PREVENTION RULES:
1. NEVER use postinstall scripts with destructive operations like rmSync()
2. If cleanup is absolutely required, add environment detection:
   ```typescript
   if (!process.cwd().includes('.claude/plugins/cache')) {
     console.log('Not in plugin cache, skipping cleanup');
     process.exit(0);
   }
   ```
3. Add path validation:
   ```typescript
   if (!pluginCacheParent.endsWith('claude-prompt-improver')) {
     console.error('Invalid cache parent path, aborting');
     process.exit(1);
   }
   ```
4. Test postinstall scripts in dev before adding to package.json
5. Use --ignore-scripts during development: 'bun add --ignore-scripts package-name'
6. ALWAYS push branches before running scripts with file operations

RECOVERY ATTEMPT:
Running PhotoRec to recover deleted files (~1.5 hours estimated)

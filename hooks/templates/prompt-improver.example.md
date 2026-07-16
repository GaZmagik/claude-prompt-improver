---
# Claude Prompt Improver Configuration
# Copy to .claude/prompt-improver.local.md and customise

enabled: true
forceImprove: false
shortPromptThreshold: 10
compactionThreshold: 5
improverModel: haiku
# contextWindowTokens: 1000000  # Set on a 1M session (or export CLAUDE_CODE_MAX_CONTEXT_TOKENS); default 200K

integrations:
  git: true
  lsp: true
  spec: true
  memory: true
  session: true
  dynamicDiscovery: true
  pluginResources: true
  projectShape: true

logging:
  enabled: true
  logFilePath: .claude/logs/prompt-improver-latest.log
  logLevel: INFO
  maxLogSizeMB: 10
  maxLogAgeDays: 7
  displayImprovedPrompt: true
  useTimestampedLogs: false
---

# Claude Prompt Improver Plugin

This file configures the Claude Prompt Improver Plugin for your project.

## Installation

Copy this file to `.claude/prompt-improver.local.md` in your project root:

```bash
cp prompt-improver.example.md .claude/prompt-improver.local.md
```

Add `.claude/prompt-improver.local.md` to your `.gitignore` to keep local settings private.

## Configuration Options

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin globally |
| `forceImprove` | boolean | `false` | Bypass all heuristic checks (for testing) |
| `shortPromptThreshold` | number | `10` | Prompts with fewer tokens bypass improvement |
| `compactionThreshold` | number | `5` | Skip when context availability is below this % |
| `improverModel` | string | `haiku` | Model for improvements (haiku, sonnet, or opus) |
| `contextWindowTokens` | number | `200000` | Context window in tokens for the low-context bypass. Resolution: this option, then `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, then a best-effort model-id check, then 200K. Set to `1000000` on a 1M session |

### Integration Toggles

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `integrations.git` | boolean | `true` | Enable git context gathering |
| `integrations.lsp` | boolean | `true` | Enable LSP diagnostics gathering |
| `integrations.spec` | boolean | `true` | Enable specification awareness |
| `integrations.memory` | boolean | `true` | Enable memory plugin integration |
| `integrations.session` | boolean | `true` | Enable session context |
| `integrations.dynamicDiscovery` | boolean | `true` | Enable dynamic resource discovery |
| `integrations.pluginResources` | boolean | `true` | Enable plugin/MCP resource context |
| `integrations.projectShape` | boolean | `true` | Enable project shape context (directories, scripts, test framework, recently modified files) |

### Logging Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logging.enabled` | boolean | `true` | Enable logging |
| `logging.logFilePath` | string | `.claude/logs/prompt-improver-latest.log` | Log file location |
| `logging.logLevel` | string | `INFO` | Log level: ERROR, INFO, or DEBUG |
| `logging.maxLogSizeMB` | number | `10` | Maximum log file size in MB |
| `logging.maxLogAgeDays` | number | `7` | Maximum log age in days |
| `logging.displayImprovedPrompt` | boolean | `true` | Show improved prompt in output |
| `logging.useTimestampedLogs` | boolean | `false` | Create timestamped log files |

## Key Name Format

Both camelCase and snake_case are supported:

```yaml
shortPromptThreshold: 10
# or
short_prompt_threshold: 10
```

## Bypass Mechanisms

The plugin checks bypass conditions in the following priority order (first match wins):

| Priority | Condition | Description | Configurable |
|----------|-----------|-------------|--------------|
| 1 | **Disabled** | Plugin `enabled: false` in config | Yes |
| 2 | **Forked session** | Running in a forked Claude session (avoids recursion) | No |
| 3 | **Skip tag** | Prompt contains `#skip` marker | No |
| 4 | **Short prompt** | Fewer than `shortPromptThreshold` tokens | Yes |
| 5 | **Low context** | Context availability below `compactionThreshold`% | Yes |

If `forceImprove: true` is set, all bypass checks except "Disabled" are skipped (useful for testing).

## Troubleshooting

### Plugin Not Working

1. Verify the config file exists at `.claude/prompt-improver.local.md`
2. Check YAML frontmatter syntax (between `---` delimiters)
3. Review logs at the configured `logFilePath`

### Integration Issues

- **Git**: Requires git repository
- **LSP**: Requires language server configured for file types
- **Spec**: Requires `.specify/` directory with spec files
- **Memory**: Requires claude-memory-plugin installed
- **Project shape**: Recently-modified files require a git repository

## Exemplars (optional)

Teach the improver your own prompting style. Add sections below headed
`## Exemplar: <genre>` where genre is one of `fix`, `investigate`, `research`,
`build`, or `general`. The section body is a gold-standard prompt in your own
style; when a prompt of that genre is improved, your exemplar replaces the
built-in worked example.

For instance (remove the > quoting to activate):

> ## Exemplar: investigate
>
> Audit every API endpoint for missing auth checks. Read-only; cite file:line
> with short excerpts. Fan the audit out to subagents, one per module. Report
> each unprotected endpoint and give a clear verdict with the most likely
> systemic cause.

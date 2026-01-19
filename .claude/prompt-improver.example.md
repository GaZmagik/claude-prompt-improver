---
# Claude Prompt Improver Configuration
# Copy to .claude/prompt-improver.local.md and customise

enabled: true
forceImprove: false
shortPromptThreshold: 10
compactionThreshold: 5
defaultSimpleModel: haiku
defaultComplexModel: sonnet

integrations:
  git: true
  lsp: true
  spec: true
  memory: true
  session: true

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
| `defaultSimpleModel` | string | `haiku` | Model for simple improvements |
| `defaultComplexModel` | string | `sonnet` | Model for complex improvements |

### Integration Toggles

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `integrations.git` | boolean | `true` | Enable git context gathering |
| `integrations.lsp` | boolean | `true` | Enable LSP diagnostics gathering |
| `integrations.spec` | boolean | `true` | Enable specification awareness |
| `integrations.memory` | boolean | `true` | Enable memory plugin integration |
| `integrations.session` | boolean | `true` | Enable session context |

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

The plugin automatically bypasses processing when:

1. **Short prompts**: Fewer than `shortPromptThreshold` tokens
2. **Skip tag**: Prompt contains `#skip`
3. **Low context**: Context availability below `compactionThreshold`%
4. **Forked sessions**: Running in a forked Claude session

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

# Claude Prompt Improver Plugin

A Claude Code plugin that automatically enhances and improves your prompts before they reach Claude. The plugin analyses prompt clarity, adds relevant context, and structures complex requests using XML tags for better AI understanding.

## Features

- **Automatic Improvement**: Enhances all prompts over 10 tokens with configurable AI models (haiku, sonnet, or opus)
- **Smart Model Selection**: Configure your preferred model (haiku for speed, sonnet for balance, opus for quality)
- **Context Injection**: Enriches prompts with relevant context from multiple sources:
  - Available tools and capabilities
  - Matching skills and agents
  - Git context (branch, recent commits, changes)
  - LSP diagnostics (errors and warnings)
  - Specification awareness (.specify/ directory)
  - Memory plugin integration
- **Bypass Mechanisms**: Skips processing for short prompts, #skip tagged prompts, low context, or forked sessions
- **XML Structuring**: Applies semantic XML tags (task, context, constraints) to complex prompts

## Requirements

- **[Bun](https://bun.sh/docs/installation)** >= 1.0.0 (required - used for hooks and package management)
- **Claude Code** >= 2.0.0

## Quick Start

### Installation

Using the [Enhance marketplace](https://github.com/GaZmagik/enhance):

```bash
# Add the marketplace (one-time)
/plugin marketplace add GaZmagik/enhance

# Install the plugin
/plugin install claude-prompt-improver
```

## Plugin Structure

```
.claude-plugin/
  plugin.json          # Plugin metadata
hooks/
  hooks.json           # Hook definitions
  user-prompt-submit/
    improve-prompt.ts  # Main hook entry point
  src/
    core/              # Core types, config, error handling
    services/          # Classification and improvement services
    context/           # Context detection and building
    integrations/      # Git, LSP, spec, memory integrations
    utils/             # Logging, token counting, XML building
```

## Configuration

Configuration is **optional** - the plugin works with sensible defaults.

On installation, the plugin creates `.claude/prompt-improver.example.md` with documented defaults. To customise:

```bash
mv .claude/prompt-improver.example.md .claude/prompt-improver.local.md
```

The configuration uses markdown with YAML frontmatter:

```yaml
---
enabled: true
shortPromptThreshold: 10
compactionThreshold: 5
improverModel: haiku  # Model for all improvements: haiku, sonnet, or opus

integrations:
  git: true
  lsp: true
  spec: true
  memory: true
  session: true
  dynamicDiscovery: true
  pluginResources: true

logging:
  enabled: true
  logFilePath: .claude/logs/prompt-improver-latest.log
  maxLogSizeMB: 10
  maxLogAgeDays: 7
  displayImprovedPrompt: true
---

# Your documentation here...
```

Add `.claude/prompt-improver.local.md` to your `.gitignore` to keep local settings private.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin globally |
| `forceImprove` | boolean | `false` | Bypass all heuristic checks (for testing) |
| `shortPromptThreshold` | number | `10` | Prompts with fewer tokens bypass improvement |
| `compactionThreshold` | number | `5` | Skip when context availability is below this % |
| `improverModel` | string | `haiku` | Model for all improvements: `haiku` (fast), `sonnet` (balanced), or `opus` (highest quality) |
| `integrations.git` | boolean | `true` | Enable git context gathering |
| `integrations.lsp` | boolean | `true` | Enable LSP diagnostics gathering |
| `integrations.spec` | boolean | `true` | Enable specification awareness |
| `integrations.memory` | boolean | `true` | Enable memory plugin integration |
| `integrations.session` | boolean | `true` | Enable session context |
| `integrations.dynamicDiscovery` | boolean | `true` | Enable dynamic discovery of skills, agents, commands, and output styles |
| `integrations.pluginResources` | boolean | `true` | Enable plugin resource scanning (skills, agents, commands, output styles from installed plugins) |
| `logging.enabled` | boolean | `true` | Enable logging |
| `logging.logFilePath` | string | `.claude/logs/...` | Log file location |
| `logging.logLevel` | string | `INFO` | Log level: ERROR, INFO, or DEBUG |
| `logging.maxLogSizeMB` | number | `10` | Maximum log file size in MB |
| `logging.maxLogAgeDays` | number | `7` | Maximum log age in days |
| `logging.displayImprovedPrompt` | boolean | `true` | Show improved prompt in output |
| `logging.useTimestampedLogs` | boolean | `false` | Create timestamped log files |

Both camelCase and snake_case key names are supported (e.g., `shortPromptThreshold` or `short_prompt_threshold`).

## Usage

The plugin works automatically. Simply type your prompts as usual, and they will be enhanced before reaching Claude.

### Bypass with #skip

Add `#skip` anywhere in your prompt to bypass improvement:

```
#skip Just run the tests
```

The tag is removed before the prompt is passed through.

### How It Works

The plugin automatically improves all prompts over 10 tokens (configurable via `shortPromptThreshold`). Short prompts, those tagged with `#skip`, and prompts during low context availability are bypassed.

Improvements include:
- **Clarity enhancement**: Removes ambiguity and adds structure
- **Context enrichment**: Injects relevant git, LSP, spec, and memory context
- **XML structuring**: Applies semantic tags (task, context, constraints) when helpful

The `improverModel` config field controls which Claude model performs the improvement:
- **haiku**: Fastest, most cost-effective (default)
- **sonnet**: Balanced speed and quality
- **opus**: Highest quality, slower

## Troubleshooting

### Plugin Not Working

1. Ensure Bun is installed and accessible
2. Check that `hooks/user-prompt-submit/improve-prompt.ts` exists
3. Verify Claude Code can see the plugin: `claude --list-plugins`

### Prompts Always Bypassed

Check if any bypass condition is triggered:
- Prompt has fewer than 10 tokens (whitespace-split)
- Prompt contains `#skip`
- Context availability is below 5%
- Running in a forked session

### Timeout Values

The plugin uses the following hardcoded timeouts:

| Operation | Timeout | Description |
|-----------|---------|-------------|
| Hook total | 90s | Maximum time for entire hook execution |
| Haiku improvement | 30s | Prompt improvement using Haiku model |
| Sonnet improvement | 60s | Prompt improvement using Sonnet model |
| Opus improvement | 90s | Prompt improvement using Opus model |
| Context gathering | 2s | Per-source timeout (git, LSP, spec, memory) |
| Git commands | 2s | Per git command (status, log, diff) |

If you consistently experience timeout errors, please open an issue with your system details.

### Integration Not Working

Verify the integration is enabled and properly configured:
- **Git**: Must be in a git repository
- **LSP**: Requires LSP server configured for your file types
- **Spec**: Requires `.specify/` directory with spec files
- **Memory**: Requires claude-memory-plugin installed

### Viewing Logs

Check the log file at `.claude/logs/prompt-improver-latest.log` for detailed execution information.

## Development

### Running Tests

```bash
cd hooks
bun test
```

### Test Coverage

The plugin has comprehensive test coverage:
- 619+ tests across 27+ files
- 1191+ expect() assertions
- TDD methodology throughout
- Unit tests for all components
- Integration tests for context building

## Licence

MIT - See [LICENSE](LICENSE) for details.

## Contributing

This plugin is developed following:
- **Specification-Driven Development** (SDD)
- **Test-Driven Development** (TDD)

All contributions should maintain 100% test coverage where possible and follow the specification first.

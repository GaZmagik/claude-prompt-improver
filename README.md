# Claude Prompt Improver Plugin

A Claude Code plugin that automatically enhances and improves your prompts before they reach Claude. The plugin analyses prompt clarity, adds relevant context, and structures complex requests using XML tags for better AI understanding.

## Features

- **Automatic Classification**: Classifies prompts as NONE (already well-structured), SIMPLE, or COMPLEX
- **Smart Improvement**: Uses Haiku for simple improvements, Sonnet for complex ones
- **Context Injection**: Enriches prompts with relevant context from multiple sources:
  - Available tools and capabilities
  - Matching skills and agents
  - Git context (branch, recent commits, changes)
  - LSP diagnostics (errors and warnings)
  - Specification awareness (.specify/ directory)
  - Memory plugin integration
- **Bypass Mechanisms**: Skips processing for short prompts, #skip tagged prompts, low context, or forked sessions
- **XML Structuring**: Applies semantic XML tags (task, context, constraints) to complex prompts

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0.0 or later)
- Claude Code CLI

### Steps

1. Clone or copy this plugin to your project:

```bash
git clone <repository-url> .claude-plugin
```

2. Install dependencies:

```bash
cd .claude-plugin
bun install
```

3. The plugin hooks are automatically detected by Claude Code from the `hooks/` directory.

### Plugin Structure

```
.claude-plugin/
  plugin.json          # Plugin metadata
hooks/
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

Configuration is **optional** - the plugin works with sensible defaults. To customise:

```bash
cp .claude/prompt-improver.example.md .claude/prompt-improver.local.md
```

The configuration uses markdown with YAML frontmatter:

```yaml
---
enabled: true
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
| `shortPromptThreshold` | number | `10` | Prompts with fewer tokens bypass improvement |
| `compactionThreshold` | number | `5` | Skip when context availability is below this % |
| `defaultSimpleModel` | string | `haiku` | Model for simple improvements |
| `defaultComplexModel` | string | `sonnet` | Model for complex improvements |
| `integrations.git` | boolean | `true` | Enable git context gathering |
| `integrations.lsp` | boolean | `true` | Enable LSP diagnostics gathering |
| `integrations.spec` | boolean | `true` | Enable specification awareness |
| `integrations.memory` | boolean | `true` | Enable memory plugin integration |
| `integrations.session` | boolean | `true` | Enable session context |
| `logging.enabled` | boolean | `true` | Enable logging |
| `logging.logFilePath` | string | `.claude/logs/...` | Log file location |
| `logging.maxLogSizeMB` | number | `10` | Maximum log file size in MB |
| `logging.maxLogAgeDays` | number | `7` | Maximum log age in days |
| `logging.displayImprovedPrompt` | boolean | `true` | Show improved prompt in output |

Both camelCase and snake_case key names are supported (e.g., `shortPromptThreshold` or `short_prompt_threshold`).

## Usage

The plugin works automatically. Simply type your prompts as usual, and they will be enhanced before reaching Claude.

### Bypass with #skip

Add `#skip` anywhere in your prompt to bypass improvement:

```
#skip Just run the tests
```

The tag is removed before the prompt is passed through.

### Classification Levels

- **NONE**: Well-structured prompts pass through unchanged
- **SIMPLE**: Minor clarity improvements using Haiku (faster, cheaper)
- **COMPLEX**: Significant restructuring using Sonnet with XML tags

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
| Classification | 5s | Prompt classification via Haiku |
| Simple improvement | 30s | Haiku-based improvement for moderately unclear prompts |
| Complex improvement | 60s | Sonnet-based improvement for vague prompts |
| Context gathering | 2s | Per-source timeout (git, LSP, spec, memory) |
| Git commands | 2s | Per git command (status, log, diff) |
| Session fork | 10s | Forking session for additional context |

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
- 454+ tests across 22+ files
- TDD methodology throughout
- Unit tests for all components
- Integration tests for context building

## Licence

MIT - See [LICENSE](LICENSE) for details.

## Contributing

This plugin is developed following:
- **Specification-Driven Development** (SDD) - see `.specify/spec-driven.md`
- **Test-Driven Development** (TDD) - see `.specify/test-driven.md`
- **British English** throughout

All contributions should maintain 100% test coverage where possible and follow the specification first.

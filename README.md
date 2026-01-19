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

Create a configuration file at `.claude/prompt-improver-config.json`:

```json
{
  "enabled": true,
  "thresholds": {
    "shortPromptTokens": 10,
    "compactionPercent": 5
  },
  "timeouts": {
    "classificationMs": 5000,
    "simpleImprovementMs": 30000,
    "complexImprovementMs": 60000,
    "contextGatheringMs": 2000
  },
  "integrations": {
    "git": true,
    "lsp": true,
    "spec": true,
    "memory": true,
    "session": true
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin globally |
| `thresholds.shortPromptTokens` | number | `10` | Prompts with fewer tokens bypass improvement |
| `thresholds.compactionPercent` | number | `5` | Skip when context availability is below this % |
| `timeouts.classificationMs` | number | `5000` | Timeout for prompt classification |
| `timeouts.simpleImprovementMs` | number | `30000` | Timeout for simple improvements (Haiku) |
| `timeouts.complexImprovementMs` | number | `60000` | Timeout for complex improvements (Sonnet) |
| `timeouts.contextGatheringMs` | number | `2000` | Timeout per context source |
| `integrations.git` | boolean | `true` | Enable git context gathering |
| `integrations.lsp` | boolean | `true` | Enable LSP diagnostics gathering |
| `integrations.spec` | boolean | `true` | Enable specification awareness |
| `integrations.memory` | boolean | `true` | Enable memory plugin integration |
| `integrations.session` | boolean | `true` | Enable session context |

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

### Timeout Errors

Increase timeout values in configuration:

```json
{
  "timeouts": {
    "complexImprovementMs": 90000
  }
}
```

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
- 436+ tests across 22+ files
- TDD methodology throughout
- Unit tests for all components
- Integration tests for context building

## Licence

MIT - See [LICENSE](LICENSE) for details.

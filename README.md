# Claude Prompt Improver Plugin

A Claude Code plugin that automatically enhances and improves your prompts before they reach Claude. The plugin analyses prompt clarity, adds relevant context, and rewrites complex requests as deep, prose-first prompts: goal and rationale up front, scoped constraints, numbered questions for multi-part work, and an explicit deliverable.

## Features

- **Opt-In or Automatic Improvement**: Choose between opt-in mode (add `#improve` tag) or automatic improvement for all prompts
- **Smart Model Selection**: Configure your preferred model (haiku for speed, sonnet for balance, opus for quality)
- **Context Injection**: Enriches prompts with relevant context from multiple sources:
  - Available tools and capabilities
  - Matching skills and agents
  - Git context (branch, recent commits, changes)
  - LSP diagnostics (errors and warnings)
  - Specification awareness (.specify/ directory)
  - Memory plugin integration
- **Bypass Mechanisms**: Skips processing for short prompts, #skip tagged prompts, low context, or forked sessions
- **Prose-First Structuring**: Rewrites complex prompts as natural prose (goal, scope, numbered questions, explicit deliverable); XML tags are kept only if the original prompt used them
- **Genre-Conditional Templates**: A keyword classifier (no extra API call) types each prompt as fix / investigate / research / build / general, and the improver receives only the core guidelines plus that genre's block and worked example
- **Personal Exemplar Library**: Add `## Exemplar: <genre>` sections to your local config and the improver teaches itself your house style instead of the built-in examples
- **Project Shape Context**: Injects top-level directories, package scripts, the test framework, and recently modified files so improved prompts cite real targets
- **Investigation & Research Depth**: Audit prompts demand file:line evidence and a closing verdict; research prompts demand verbatim quotes, VERIFIED-vs-inferred separation, and honest negative results
- **Agent & Workflow Awareness**: Suggests subagent fan-out for parallelisable investigation and explicit workflow opt-in for large multi-agent tasks, proportionate to the request

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
  projectShape: true

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
| `defaultImprove` | boolean | `false` | Enable automatic improvement by default (when `false`, requires `#improve` tag) |
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
| `integrations.projectShape` | boolean | `true` | Enable project shape context (directories, scripts, test framework, recently modified files) |
| `logging.enabled` | boolean | `true` | Enable logging |
| `logging.logFilePath` | string | `.claude/logs/...` | Log file location |
| `logging.logLevel` | string | `INFO` | Log level: ERROR, INFO, or DEBUG |
| `logging.maxLogSizeMB` | number | `10` | Maximum log file size in MB |
| `logging.maxLogAgeDays` | number | `7` | Maximum log age in days |
| `logging.displayImprovedPrompt` | boolean | `true` | Show improved prompt in output |
| `logging.useTimestampedLogs` | boolean | `false` | Create timestamped log files |

Both camelCase and snake_case key names are supported (e.g., `shortPromptThreshold` or `short_prompt_threshold`).

### Personal Exemplars

Teach the improver your own prompting style: add `## Exemplar: <genre>` sections (genres: `fix`, `investigate`, `research`, `build`, `general`) to the markdown body of `.claude/prompt-improver.local.md`. The section body is a gold-standard prompt in your style, and it replaces the built-in worked example whenever a prompt of that genre is improved.

## Usage

### Opt-In Mode (Default)

By default, the plugin operates in **opt-in mode** where improvement only happens when you explicitly add the `#improve` tag to your prompt:

```
Please help me understand the authentication system #improve
```

The `#improve` tag is removed before the prompt reaches Claude, so it won't appear in the conversation.

**Why opt-in?** Prompt improvement adds latency per prompt (typically seconds with haiku, historically up to 30-50s). Opt-in mode gives you control over when to wait for enhanced prompts.

### Automatic Mode

To enable automatic improvement for all prompts (original behaviour), set `defaultImprove: true` in your configuration:

```yaml
---
defaultImprove: true
---
```

With automatic mode enabled, all prompts over 10 tokens will be improved by default.

### Bypass with #skip

Add `#skip` anywhere in your prompt to bypass improvement (works in both modes):

```
#skip Just run the tests
```

The tag is removed before the prompt is passed through.

### How It Works

**In opt-in mode (default):** Only prompts with the `#improve` tag are enhanced. This prevents unexpected delays.

**In automatic mode:** All prompts over 10 tokens (configurable via `shortPromptThreshold`) are improved. Short prompts, those tagged with `#skip`, and prompts during low context availability are bypassed.

Improvements include:
- **Clarity enhancement**: Removes ambiguity and adds structure
- **Context enrichment**: Injects relevant git, LSP, spec, and memory context
- **Prose-first structuring**: Goal and rationale first, then scope, numbered questions, and an explicit deliverable; investigation and research prompts gain evidence and verdict requirements
- **Verification and candour**: Non-trivial prompts end by naming how to verify the work; advice prompts instruct honest pushback
- **Orchestration suggestions**: Subagent fan-out or workflow opt-in phrasing where the task warrants it

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
| Hook total | 120s | Maximum time for entire hook execution (hooks.json) |
| Haiku improvement | 60s | Prompt improvement using Haiku model |
| Sonnet improvement | 90s | Prompt improvement using Sonnet model |
| Opus improvement | 100s | Prompt improvement using Opus model |
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

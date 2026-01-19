# Exploration: Claude Prompt Improver Plugin

## Feature Intent

Create a reusable Claude Code plugin for the GaZmagik/enhance marketplace that provides intelligent prompt improvement on user prompt submission. The plugin consolidates and improves upon two existing hook implementations:

1. **Manual trigger** - Hashtag-activated improvement (e.g., `#pi`) routing to various AI backends
2. **Automatic assessment** - Classifying prompts to determine if improvement is needed, then routing appropriately

The unified plugin should:
- Automatically assess prompt quality and improve when beneficial
- Support manual bypass (`#skip`) for when users want raw prompts
- Skip short prompts (≤10 tokens) as these are typically confirmations
- Inject relevant context (tools, skills, MCP servers, LSP servers)
- Use XML tags for structured prompt sections (per Anthropic best practices)
- Work without Ollama dependency (use Claude models directly)

## Suggested Specify Prompt

```
Create a Claude Code plugin named "claude-prompt-improver" for the GaZmagik/enhance marketplace that automatically improves user prompts before they reach the main Claude session.

**Core Functionality:**

1. **Automatic Quality Assessment**
   - Analyse incoming prompts to determine if improvement would be beneficial
   - Classification levels: NONE (pass through), SIMPLE (light touch), COMPLEX (significant restructuring)
   - Use Claude Haiku for fast, cost-effective classification

2. **Prompt Improvement Pipeline**
   - NONE: Pass prompt through unchanged
   - SIMPLE: Use Claude Haiku for light improvements (structure, clarity)
   - COMPLEX: Use Claude Sonnet for comprehensive restructuring

3. **Bypass Mechanisms**
   - `#skip` tag: Bypass all processing, pass prompt unchanged
   - Short prompts (≤10 tokens): Automatically skip (typically confirmations like "yes", "do it", "looks good")

4. **Context Injection**
   - Gather available tools from session context
   - Identify relevant skills that could help with the task
   - Include MCP server capabilities when relevant
   - Note available LSP servers for code intelligence
   - Suggest relevant agents (e.g., typescript-expert, security-code-expert) based on prompt content

5. **Memory Plugin Integration** (optional, graceful degradation)
   - Detect if claude-memory-plugin is installed
   - If available, read index.json to find relevant memories
   - Suggest memories that could inform the task (decisions, learnings, gotchas)
   - Skip gracefully if memory plugin not installed

6. **Git Context Awareness**
   - Recent commits (last 3-5) to understand current work focus
   - Changed/staged files to inject relevant file context
   - Current branch name for feature/bugfix context
   - Uncommitted changes summary

7. **LSP Diagnostics Integration**
   - Detect current errors/warnings from LSP servers
   - If prompt seems related to fixing issues, inject diagnostics
   - Prioritise errors over warnings
   - Limit to most relevant diagnostics (avoid noise)

8. **Specification Awareness**
   - Check for .specify/ directory
   - If spec.md, plan.md, or tasks.md exist, check relevance to prompt
   - Inject relevant spec context (current task, acceptance criteria)
   - Useful for keeping implementation aligned with specification

9. **Session Context** (fork approach with compaction detection)
   - Fork session to get conversation context for improvement
   - **Compaction detection**: Claude Code passes context info via stdin
   - Check if auto-compaction is enabled in settings
   - Calculate available context percentage from stdin data
   - If <5% context available, skip prompt improvement entirely
   - Avoids wasted API calls and latency for doomed forks

10. **XML Tag Structuring**
   - Use Anthropic-recommended XML tags to structure improved prompts
   - Tags: <task>, <context>, <constraints>, <output_format>, <examples>
   - Only add tags when they genuinely improve clarity

11. **Configuration**
   - Enable/disable automatic improvement (default: enabled)
   - Set token threshold for short prompt detection (default: 10)
   - Choose default improvement model (Haiku vs Sonnet)
   - Toggle context injection features individually
   - Configure which integrations are active (git, LSP, spec, session, memory)

**User Experience:**
- Display improved prompt in system message before execution
- Log improvements to `.claude/logs/prompt-improver-latest.log`
- Show classification level and model used
- Preserve user's original tone and intent

**Technical Constraints:**
- TypeScript with Bun runtime
- No Ollama dependency (Claude models only)
- Follow plugin structure from claude-memory-plugin
- Timeout handling with graceful degradation
- Skip processing for forked sessions
- TDD with 1:1 test file parity (every .ts has a .spec.ts)

**Documentation:**
- README.md at repository root for GitHub/marketplace visibility
- Installation instructions, configuration options, usage examples
- Badge showing test status, version, license
```

## Suggested Plan Prompt

```
Plan the implementation of claude-prompt-improver plugin using the established plugin architecture from claude-memory-plugin.

**Architecture:**

1. **Plugin Structure** (TDD: 1:1 test parity - every .ts has adjacent .spec.ts)
   ```
   claude-prompt-improver/
   ├── .claude-plugin/
   │   └── plugin.json              # Plugin metadata
   ├── hooks/
   │   ├── user-prompt-submit/
   │   │   ├── improve-prompt.ts    # Main hook entry point
   │   │   └── improve-prompt.spec.ts
   │   └── src/
   │       ├── core/
   │       │   ├── types.ts
   │       │   ├── types.spec.ts
   │       │   ├── error-handler.ts
   │       │   ├── error-handler.spec.ts
   │       │   ├── constants.ts
   │       │   └── constants.spec.ts
   │       ├── services/
   │       │   ├── classifier.ts        # Prompt quality classification
   │       │   ├── classifier.spec.ts
   │       │   ├── improver.ts          # Prompt improvement logic
   │       │   ├── improver.spec.ts
   │       │   ├── claude-client.ts     # Claude API interactions
   │       │   └── claude-client.spec.ts
   │       ├── context/
   │       │   ├── tool-detector.ts
   │       │   ├── tool-detector.spec.ts
   │       │   ├── skill-matcher.ts
   │       │   ├── skill-matcher.spec.ts
   │       │   ├── agent-suggester.ts      # Suggest relevant agents
   │       │   ├── agent-suggester.spec.ts
   │       │   ├── context-builder.ts
   │       │   └── context-builder.spec.ts
   │       ├── integrations/
   │       │   ├── memory-plugin.ts        # Optional memory plugin integration
   │       │   ├── memory-plugin.spec.ts
   │       │   ├── git-context.ts          # Git commits, changes, branch
   │       │   ├── git-context.spec.ts
   │       │   ├── lsp-diagnostics.ts      # LSP errors/warnings
   │       │   ├── lsp-diagnostics.spec.ts
   │       │   ├── spec-awareness.ts       # .specify/ integration
   │       │   ├── spec-awareness.spec.ts
   │       │   ├── session-context.ts      # Session forking for context
   │       │   ├── session-context.spec.ts
   │       │   ├── compaction-detector.ts  # Detect if near compaction threshold
   │       │   └── compaction-detector.spec.ts
   │       └── utils/
   │           ├── token-counter.ts
   │           ├── token-counter.spec.ts
   │           ├── xml-builder.ts
   │           └── xml-builder.spec.ts
   ├── README.md                    # GitHub/marketplace documentation
   ├── LICENSE
   └── package.json
   ```

2. **Classification Strategy**
   - Use Claude Haiku with a focused system prompt
   - Input: raw prompt + basic project context
   - Output: JSON with { classification: "NONE" | "SIMPLE" | "COMPLEX", reasoning: string }
   - Timeout: 5 seconds, default to NONE on failure

3. **Improvement Strategy**
   - Build improvement prompt with:
     - Project context (directory, name, git branch)
     - Available tools/skills/servers (from context detection)
     - Improvement level guidance based on classification
   - Use XML tags in system prompt to structure Claude's response
   - Extract improved prompt from JSON response

4. **Context Detection**
   - Tools: Parse session settings or use known Claude Code tools list
   - Skills: Read skill-rules.json if available, match against prompt
   - MCP servers: Check enabled MCP servers in settings
   - LSP servers: Check enabled LSP plugins
   - Agents: Match prompt keywords against agent descriptions (typescript-expert, rust-expert, etc.)

5. **Memory Plugin Integration** (optional)
   - Check for claude-memory-plugin installation at known paths
   - If found, read index.json to get memory index
   - Match prompt against memory titles/tags using simple keyword matching
   - Inject relevant memory suggestions into improved prompt
   - Graceful degradation: skip entirely if plugin not installed

6. **Git Context Integration**
   - Run `git log --oneline -5` for recent commits
   - Run `git status --porcelain` for changed files
   - Run `git diff --stat` for uncommitted changes summary
   - Timeout: 2s per command, skip on failure

7. **LSP Diagnostics Integration**
   - Use mcp__ide__getDiagnostics if available
   - Filter to errors first, then warnings if few errors
   - Match file paths against prompt keywords
   - Limit to 5 most relevant diagnostics

8. **Specification Integration**
   - Check for .specify/spec.md, plan.md, tasks.md
   - Parse frontmatter for current task status
   - Extract relevant acceptance criteria
   - Inject spec context for implementation prompts

9. **Session Context Integration** (fork approach)
   - Fork session using `claude --fork-session` for improvement calls
   - **Compaction detection**: Use context info from stdin (same as statusline)
   - Detection logic:
     - Parse context usage data from hook stdin input
     - Check if auto-compaction is enabled in settings
     - Calculate: available_context_percentage = (max - used) / max * 100
     - Skip if available_context_percentage < 5%
   - If near compaction threshold, skip improvement entirely
   - Return original prompt with "skipped: near compaction" in additionalContext

10. **Token Counting**
   - Simple heuristic: split on whitespace, count tokens
   - No need for precise tokenisation (threshold is approximate)

11. **Error Handling**
   - Graceful degradation: on any failure, pass through original prompt
   - Log errors to hook logger
   - Never block user prompts due to improvement failures

**Key Decisions:**
- Reuse error-handler.ts pattern from claude-memory-plugin
- Use `claude --print` CLI for Claude API calls (consistent with existing hooks)
- Fork session for improvement calls to avoid context pollution
- XML tags only added when classification warrants restructuring
```

## Research Notes

### Recommended Approach

**Unified Classification + Improvement Pipeline:**
1. Check bypass conditions first (`#skip`, short prompt, forked session)
2. Run fast classification with Haiku (~5s timeout)
3. Route to appropriate improvement model or pass through
4. Inject context only for COMPLEX improvements
5. Structure output with XML tags for substantial improvements

### Technology Evaluation

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| **Classification** | Claude Haiku | Fast, cheap, sufficient for binary/ternary classification |
| **Simple Improvement** | Claude Haiku | Light touch doesn't need Sonnet's capability |
| **Complex Improvement** | Claude Sonnet | Better restructuring and context integration |
| **Token Counting** | Whitespace split | Precise tokenisation unnecessary for threshold check |
| **XML Tags** | Custom builder | Simple, no external deps needed |
| **Claude API** | CLI (`claude --print`) | Consistent with existing hooks, handles auth |

### Alternatives Considered

1. **Keep Ollama for classification**
   - Pro: Local, no API cost
   - Con: Requires Ollama running, adds complexity, user requested removal

2. **Single model for all improvements**
   - Pro: Simpler implementation
   - Con: Either expensive (Sonnet for everything) or lower quality (Haiku for complex)

3. **Streaming responses**
   - Pro: Could show improvement in progress
   - Con: Hooks have timeout constraints, adds complexity

### Key Considerations

**Performance:**
- Classification timeout: 5s (graceful degradation to NONE)
- Improvement timeout: 15-30s depending on model
- Total hook timeout should stay under 90s

**Cost:**
- Haiku classification: ~$0.00025 per prompt (minimal)
- Haiku improvement: ~$0.001 per improved prompt
- Sonnet improvement: ~$0.015 per complex improvement
- Most prompts should classify as NONE (pass through)

**Security:**
- Never log sensitive prompt content to files in cleartext
- Forked session detection prevents recursive hook triggering
- No external API calls beyond Claude (no data leakage)

**Complexity:**
- Context detection is best-effort (graceful degradation if settings unavailable)
- XML tags only when genuinely helpful (avoid over-structuring simple requests)

### Open Questions

1. **Settings storage:** Use plugin-specific settings file or integrate with main settings.json?
2. **Context injection scope:** Should we inject full tool descriptions or just names?
3. **Manual trigger retention:** Keep hashtag triggers (`#pi`) for explicit model selection?
4. **Metrics/logging:** Track improvement statistics over time?

### Existing Code to Reuse

From `~/.claude/hooks/ts/`:
- `lib/error-handler.ts` - Hook wrapper pattern (adapt from plugin version)
- `user-prompt-submit/prompt-improver.ts` - Improvement prompt template
- `user-prompt-submit/context-reinforcer.ts` - Context injection pattern

From `claude-memory-plugin`:
- `hooks/src/core/` - Complete core infrastructure
- Plugin structure and packaging conventions

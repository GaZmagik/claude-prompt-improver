# Research: Claude Prompt Improver Plugin

**Purpose**: Document technology evaluation, architectural decisions, and technical investigations for the prompt improver plugin.

**Date**: 2026-01-18

---

## Decision 1: Classification Strategy

**Chosen**: Claude Haiku with focused system prompt returning JSON classification

**Rationale**:
- Cost-effective: Haiku cheaper than Sonnet for rapid classification
- Fast: Sub-5 second response time for classification decision
- Structured output: JSON response ensures reliable parsing
- Context-aware: Can consider basic project context in classification

**Classification Prompt Design**:
```
You are a prompt quality classifier. Analyse the user's prompt and classify it into one of three categories:

- NONE: Well-structured, clear, and specific. Needs no improvement.
- SIMPLE: Moderately unclear or could benefit from minor enhancements.
- COMPLEX: Vague, multi-faceted, or requires significant restructuring.

Consider:
1. Specificity: Does the prompt clearly state what's needed?
2. Context: Is sufficient background provided?
3. Scope: Is the request well-bounded or overly broad?
4. Actionability: Can the request be acted upon without clarification?

Respond ONLY with JSON in this format:
{
  "classification": "NONE" | "SIMPLE" | "COMPLEX",
  "reasoning": "Brief explanation of classification"
}

Prompt to classify:
{user_prompt}

Project context:
{context_summary}
```

**Alternatives Considered**:

### Alternative A: Rule-Based Classification
- **Pros**: Fast (no API call), deterministic, zero cost
- **Cons**: Brittle rules (hard to capture nuance), high maintenance overhead, poor accuracy on edge cases
- **Why not chosen**: Cannot reliably distinguish between well-formed prompts and those needing improvement without semantic understanding

### Alternative B: Sonnet for Classification
- **Pros**: Higher accuracy potential, better nuance detection
- **Cons**: 5-10x cost increase, slower response (similar latency to Haiku in practice)
- **Why not chosen**: Marginal accuracy gain doesn't justify cost increase for a decision that happens on every prompt

### Alternative C: Skip Classification, Always Improve
- **Pros**: Simpler logic, no classification API call
- **Cons**: Wastes resources on already-good prompts, adds unnecessary latency, user frustration with over-engineering
- **Why not chosen**: Bypass logic alone insufficient to avoid improving well-structured prompts

**Test Plan**: Create corpus of 20+ prompts across categories:
- 5 NONE examples (clear, specific, well-structured)
- 5 SIMPLE examples (moderately unclear, missing minor details)
- 10 COMPLEX examples (vague, multi-faceted, poorly structured)

Validate classification prompt achieves >80% accuracy.

---

## Decision 2: Session Forking Approach

**Chosen**: Use `claude --fork-session --print "prompt"` for all Claude API calls

**Rationale**:
- **Isolation**: Forked sessions don't pollute main conversation history
- **Recursion prevention**: Can detect forked context via `permission_mode` in stdin
- **Consistency**: Same mechanism used for classification and improvement
- **Simplicity**: Single API interaction pattern across plugin

**Detection Mechanism**:
```typescript
interface HookInput {
  prompt: string;
  context: {
    permission_mode?: string; // "fork" indicates forked session
    conversation_id: string;
    message_index: number;
    // ... other context fields
  };
}

function isForkedSession(input: HookInput): boolean {
  return input.context.permission_mode === "fork";
}
```

**Alternatives Considered**:

### Alternative A: Direct API Calls (HTTP)
- **Pros**: More control over request/response, no CLI dependency
- **Cons**: Authentication complexity, bypasses Claude Code CLI abstractions, fragile to API changes
- **Why not chosen**: Claude Code CLI is the official interface, maintains compatibility with updates

### Alternative B: No Session Forking (Use Main Session)
- **Pros**: Simpler (no fork detection needed)
- **Cons**: Pollutes conversation history with internal improvement calls, no recursion prevention, user sees internal prompts
- **Why not chosen**: Unacceptable UX degradation (internal prompts clutter conversation)

**Test Plan**:
1. Create test hook that forks session and checks `permission_mode`
2. Verify forked session doesn't appear in main conversation history
3. Confirm recursion prevention (forked hook immediately bypasses)

---

## Decision 3: Context Information Extraction

**Chosen**: Parse hook stdin JSON for tools, skills, MCP servers, and context usage

**Rationale**:
- Hook stdin provides rich context about session state
- Standardised format (JSON) ensures reliable parsing
- Includes available tools, enabled servers, context usage stats

**Expected Stdin Structure** (researched from Claude Code hook documentation):
```json
{
  "prompt": "user's prompt text",
  "context": {
    "conversation_id": "uuid",
    "message_index": 42,
    "permission_mode": null,
    "available_tools": ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
    "enabled_mcp_servers": ["ripgrep", "lsp"],
    "context_usage": {
      "used": 12345,
      "max": 200000,
      "auto_compaction_enabled": true
    },
    "session_settings": {
      "model": "claude-sonnet-4-5",
      "skills": ["memory", "typescript-expert"]
    }
  }
}
```

**Parsing Strategy**:
1. **Tools**: Extract from `available_tools` array
2. **Skills**: Extract from `session_settings.skills` array
3. **MCP Servers**: Extract from `enabled_mcp_servers` array
4. **Context Availability**: Calculate `(max - used) / max * 100` from `context_usage`
5. **Forked Session**: Check `permission_mode === "fork"`

**Alternatives Considered**:

### Alternative A: Query CLI for Context
- **Pros**: Explicit, doesn't rely on stdin format
- **Cons**: Additional CLI calls increase latency, stdin already provides this info
- **Why not chosen**: Redundant, stdin contains required information

### Alternative B: Hardcode Known Tools
- **Pros**: No parsing needed, always accurate for known tools
- **Cons**: Breaks when new tools added, misses custom MCP servers
- **Why not chosen**: Not future-proof, doesn't detect actual availability

**Test Plan**:
1. Mock stdin with various tool/skill/server configurations
2. Verify parser extracts correct information
3. Test graceful handling of missing fields (older Claude Code versions)

---

## Decision 4: Token Counting Strategy

**Chosen**: Whitespace-split heuristic (`prompt.split(/\s+/).length`)

**Rationale**:
- Simple: No external dependencies, fast execution
- Sufficient: Threshold is ~10 tokens, precision not critical
- Conservative: Slight over-counting acceptable for bypass logic

**Accuracy Analysis**:
- "yes" → 1 token (accurate)
- "continue with that" → 3 tokens (accurate)
- "fix the bug" → 3 tokens (accurate)
- "let's proceed" → 2 tokens (accurate, "let's" counts as 1 word)
- Typical error margin: ±1 token for prompts near threshold

**Alternatives Considered**:

### Alternative A: GPT-style Tokeniser (e.g., tiktoken)
- **Pros**: Precise token counting matching Claude's tokeniser
- **Cons**: External dependency, slower, overkill for approximate threshold
- **Why not chosen**: Precision unnecessary for ~10 token bypass threshold

### Alternative B: Character Count Heuristic
- **Pros**: Even simpler, no splitting needed
- **Cons**: Less accurate (long words vs short words), harder to calibrate threshold
- **Why not chosen**: Token count more intuitive for users, easier to document

**Test Plan**:
1. Count tokens for 20+ short prompts
2. Compare whitespace-split to manual token count
3. Verify prompts near threshold (9-11 tokens) behave as expected

---

## Decision 5: XML Tag Selection and Application

**Chosen**: Selective application of Anthropic-recommended tags based on prompt complexity

**Tags to Use**:
- `<task>`: Main request/goal (always for COMPLEX improvements)
- `<context>`: Injected information (git/LSP/spec/memory)
- `<constraints>`: Limitations, requirements, boundaries
- `<output_format>`: Expected response structure
- `<examples>`: Example inputs/outputs

**Application Logic**:
```
NONE classification: No tags (pass through)
SIMPLE classification: Tags only if genuinely improving clarity (rare)
COMPLEX classification: Apply tags to structure multi-faceted requests
```

**Tag Detection Heuristics**:
- Multiple questions/requests → `<task>` with numbered items
- Context from integrations → `<context>` wrapper
- "output", "format", "structure" keywords → `<output_format>`
- "for example", "like this" keywords → `<examples>`
- "must", "should", "don't" keywords → `<constraints>`

**Rationale**:
- Anthropic documentation recommends XML tags for complex prompts
- Structured prompts improve Claude's parsing and response quality
- Over-application creates verbosity without benefit (SIMPLE prompts)

**Alternatives Considered**:

### Alternative A: Always Apply Tags
- **Pros**: Consistent structure, no detection logic needed
- **Cons**: Verbose for simple prompts, degrades readability, user annoyance
- **Why not chosen**: Breaks principle of "improve only when beneficial"

### Alternative B: Never Apply Tags
- **Pros**: Simpler, no tag logic needed
- **Cons**: Misses opportunity to improve complex prompt parsing
- **Why not chosen**: Leaves value on the table for genuinely complex requests

### Alternative C: Use Markdown Headers Instead
- **Pros**: More human-readable, familiar to users
- **Cons**: Less reliable parsing by Claude (headers not semantic tags)
- **Why not chosen**: XML tags explicitly recommended by Anthropic for structured prompts

**Test Plan**:
1. Create complex prompts with multiple concerns
2. Apply tags manually, test Claude's response quality
3. Compare tagged vs untagged improvements
4. Verify tags don't break for edge cases (existing XML in prompt)

---

## Decision 6: Memory Plugin Integration Pattern

**Chosen**: Optional integration with detection at known paths, keyword-based matching

**Detection Strategy**:
1. Check for plugin at `~/.claude/plugins/claude-memory-plugin/`
2. Read `index.json` if present
3. Match prompt keywords against memory titles and tags
4. Return top 3-5 most relevant memories

**Keyword Matching Algorithm**:
```typescript
function matchMemories(prompt: string, memories: Memory[]): Memory[] {
  const keywords = extractKeywords(prompt); // Lowercase, remove stop words

  return memories
    .map(memory => ({
      memory,
      score: calculateRelevance(keywords, memory)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.memory);
}

function calculateRelevance(keywords: string[], memory: Memory): number {
  let score = 0;

  // Title matches (weighted 3x)
  keywords.forEach(kw => {
    if (memory.title.toLowerCase().includes(kw)) score += 3;
  });

  // Tag matches (weighted 2x)
  memory.tags?.forEach(tag => {
    if (keywords.includes(tag.toLowerCase())) score += 2;
  });

  // Content matches (weighted 1x)
  keywords.forEach(kw => {
    if (memory.content?.toLowerCase().includes(kw)) score += 1;
  });

  return score;
}
```

**Rationale**:
- Simple keyword matching sufficient for relevance detection
- Avoids additional LLM call for semantic similarity (cost/latency)
- Graceful degradation if memory plugin absent or schema changes

**Alternatives Considered**:

### Alternative A: Semantic Similarity with Embeddings
- **Pros**: More accurate relevance matching, catches synonyms
- **Cons**: Requires embedding API calls, significant latency increase, external dependency
- **Why not chosen**: Keyword matching sufficient for first version, can upgrade later if needed

### Alternative B: No Memory Integration
- **Pros**: Simpler, no dependency on another plugin
- **Cons**: Misses valuable context for consistency and avoiding repeated mistakes
- **Why not chosen**: High value for users with memory plugin, graceful skip for those without

### Alternative C: Ask User Which Memories to Include
- **Pros**: User controls relevance
- **Cons**: Breaks automatic improvement (requires interaction), adds latency
- **Why not chosen**: Defeats "automatic" value proposition

**Test Plan**:
1. Create test `index.json` with diverse memories
2. Test keyword matching with various prompts
3. Verify top 3-5 results are actually relevant
4. Confirm graceful skip when plugin absent

---

## Decision 7: LSP Diagnostics Invocation

**Chosen**: Use MCP interface `mcp__ide__getDiagnostics` if available

**Invocation Pattern**:
```typescript
async function getLSPDiagnostics(): Promise<Diagnostic[]> {
  try {
    // Check if LSP MCP server enabled
    if (!isMCPServerEnabled("lsp")) {
      return [];
    }

    // Invoke via MCP interface (details TBD based on Claude Code MCP docs)
    const result = await invokeMCPTool("mcp__ide__getDiagnostics", {
      severity: ["error", "warning"]
    });

    return result.diagnostics || [];
  } catch (error) {
    console.error("LSP diagnostics failed:", error);
    return []; // Graceful skip
  }
}
```

**Filtering Strategy**:
1. Prioritise errors over warnings
2. Match file paths to prompt keywords (e.g., "fix auth.ts" → prioritise auth.ts diagnostics)
3. Limit to 5 most relevant diagnostics
4. Include: file path, line number, severity, message

**Rationale**:
- MCP interface standardised across LSP implementations
- Graceful fallback if LSP not configured
- Filtering prevents context overload

**Alternatives Considered**:

### Alternative A: Direct LSP Protocol Communication
- **Pros**: More control, can query specific files
- **Cons**: Complex protocol, language-specific servers, fragile
- **Why not chosen**: MCP abstraction simpler, Claude Code already handles LSP integration

### Alternative B: Parse LSP Logs from Filesystem
- **Pros**: No active LSP query needed
- **Cons**: Log format varies, stale data, unreliable
- **Why not chosen**: MCP interface provides fresh, structured data

**Test Plan**:
1. Set up test project with TypeScript LSP
2. Introduce intentional errors
3. Verify `getDiagnostics` returns errors
4. Test filtering and prioritisation
5. Confirm graceful skip when LSP unavailable

---

## Open Questions

### OQ-001: Optimal Short Prompt Threshold
**Question**: Is 10 tokens the right threshold for bypass, or should it be configurable/adaptive?

**Investigation Needed**:
- Analyse typical "short confirmation" prompts ("yes", "ok", "continue")
- Test threshold values: 5, 10, 15, 20 tokens
- Determine false positive rate (good prompts incorrectly bypassed)

**Proposed Resolution**: Start with 10 tokens (configurable), gather usage data, adjust based on user feedback

---

### OQ-002: Improved Prompt Length Limits
**Question**: How to handle improved prompts that approach context limits?

**Investigation Needed**:
- Measure typical improvement length increase (baseline → improved)
- Calculate safe threshold (e.g., if original + improvement > 80% of remaining context)
- Define fallback strategy (use SIMPLE instead, or pass through original)

**Proposed Resolution**: Monitor improved prompt length, fallback to SIMPLE if >50% context consumed, pass through if >80%

---

### OQ-003: Specification Keyword Matching
**Question**: What's the best strategy for matching prompts to specification content?

**Investigation Needed**:
- Test simple string matching vs semantic similarity
- Evaluate false positive rate (irrelevant specs injected)
- Determine performance impact of different approaches

**Proposed Resolution**: Start with simple keyword matching (title, user story IDs, tags), upgrade to semantic if insufficient

---

### OQ-004: Bypass Reason Visibility
**Question**: Should bypass reasons be shown to users in the UI, or only logged?

**Investigation Needed**:
- UX consideration: does showing "skipped: short prompt" help or annoy?
- Logging vs UI output trade-offs
- User preference survey (if possible)

**Proposed Resolution**: Log all bypass reasons, optionally display in debug mode (env var or config flag)

---

### OQ-005: Configuration Scope
**Question**: Should configuration support per-project overrides or only global settings?

**Investigation Needed**:
- Use cases for per-project config (e.g., disable git integration in non-dev projects)
- File location: `.claude-prompt-improver.json` in project root?
- Precedence rules: project > user > defaults

**Proposed Resolution**: Start with global config only (`.claude/prompt-improver-config.json`), add per-project in v1.1 if requested

---

### OQ-006: Context Source Prioritisation
**Question**: When context budget is limited, which sources should be prioritised?

**Investigation Needed**:
- Rank sources by value: LSP diagnostics (high for debugging) > git (high for dev) > spec (medium) > memory (medium) > session (low)
- Define priority rules based on prompt keywords (e.g., "fix" → prioritise LSP)

**Proposed Resolution**: Dynamic prioritisation based on prompt content, fallback to static priority: LSP > git > spec > memory > session

---

### OQ-007: Log Rotation Policy
**Question**: How to prevent unbounded log file growth?

**Investigation Needed**:
- Estimate log entry size (~500 bytes per prompt)
- Calculate storage for 100 prompts/day over 30 days (~1.5 MB)
- Define rotation threshold (max size or max age)

**Proposed Resolution**: Rotate when log exceeds 10 MB or keep last 7 days, whichever comes first. Implement simple truncation on startup.

---

## References

- [Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Hook Interface](https://code.claude.com/docs/en/hooks)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [XML Tags for Claude](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- [Claude Memory Plugin Reference Implementation](https://github.com/GaZmagik/claude-memory-plugin)

---

**Research Version**: 1.0.0 | **Status**: Draft | **Created**: 2026-01-18

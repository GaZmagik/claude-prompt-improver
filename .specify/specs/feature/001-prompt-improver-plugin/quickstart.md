# Quickstart: Claude Prompt Improver Plugin

**Purpose**: Validate implementation against success criteria through step-by-step scenarios.

**Date**: 2026-01-18

---

## Prerequisites

1. **Claude Code installed** with API access to Haiku and Sonnet models
2. **Bun runtime** (version 1.0+) installed
3. **Plugin installed** via:
   ```bash
   claude plugin install GaZmagik/claude-prompt-improver
   # OR manually:
   git clone https://github.com/GaZmagik/claude-prompt-improver.git ~/.claude/plugins/claude-prompt-improver
   ```
4. **Test repository** with git, LSP configured (optional for advanced scenarios)

---

## Scenario 1: Basic Classification and Improvement (US1)

**Goal**: Validate that prompts are correctly classified and improved based on complexity.

**Success Criteria**: SC-001, SC-002, SC-003

### Test Case 1A: COMPLEX Prompt Improvement

**Steps**:
1. Open Claude Code in a test project
2. Submit prompt: `"fix the bug"`
3. Observe hook processing (should take <60 seconds)
4. Check output displayed before execution

**Expected Outcome**:
- Classification: COMPLEX
- Improved prompt includes:
  - Clarifying questions (which bug? what symptoms? where to look?)
  - Structured format (likely with XML tags)
  - Request for more specifics
- Processing completes within 60 seconds
- Original intent preserved (fixing a bug)

**Validation**:
```bash
# Check log entry
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.'

# Expected JSON structure:
{
  "timestamp": "2026-01-18T...",
  "originalPrompt": "fix the bug",
  "improvedPrompt": "<task>Investigate and fix the bug...",
  "classification": "COMPLEX",
  "modelUsed": "sonnet",
  "totalLatency": <60000,  # milliseconds
  "contextSources": [...]
}
```

### Test Case 1B: NONE Classification (Pass Through)

**Steps**:
1. Submit well-structured prompt: `"Please review the authentication logic in src/auth.ts and suggest improvements for security best practices"`
2. Observe hook processing

**Expected Outcome**:
- Classification: NONE
- Prompt passed through unchanged
- Processing completes within 5 seconds (classification only)
- Log shows classification but no improvement

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.classification, .improvedPrompt'
# Expected:
# "NONE"
# null (or same as originalPrompt)
```

### Test Case 1C: SIMPLE Prompt Enhancement

**Steps**:
1. Submit moderately unclear prompt: `"help with testing"`
2. Observe hook processing

**Expected Outcome**:
- Classification: SIMPLE
- Improved prompt includes:
  - Clarification of testing type (unit, integration, e2e)
  - Request for what needs testing
  - Enhanced using Haiku (faster, cheaper)
- Processing completes within 30 seconds
- Original intent preserved (getting help with testing)

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.classification, .modelUsed, .totalLatency'
# Expected:
# "SIMPLE"
# "haiku"
# <30000
```

---

## Scenario 2: Smart Bypass Mechanisms (US2)

**Goal**: Validate that bypass conditions correctly skip improvement processing.

**Success Criteria**: SC-006

### Test Case 2A: Short Prompt Bypass

**Steps**:
1. Submit short confirmation: `"yes"`
2. Observe hook processing (should be <100ms)

**Expected Outcome**:
- Bypass reason: `short_prompt`
- Prompt passed through unchanged
- Processing completes in <100ms
- Log shows bypass reason

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.bypassReason, .totalLatency'
# Expected:
# "short_prompt"
# <100
```

### Test Case 2B: Explicit Skip Tag

**Steps**:
1. Submit prompt with tag: `"implement user authentication #skip"`
2. Observe output

**Expected Outcome**:
- Bypass reason: `explicit_skip`
- Tag removed from passed-through prompt: `"implement user authentication"`
- Processing completes in <100ms

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.originalPrompt, .bypassReason'
# Expected:
# "implement user authentication #skip"
# "explicit_skip"
```

### Test Case 2C: Low Context Bypass

**Steps**:
1. Engage in long conversation until context >95% used
2. Submit any prompt
3. Observe processing

**Expected Outcome**:
- Bypass reason: `low_context`
- Prompt passed through unchanged
- Processing completes in <100ms
- Preserves remaining context for actual response

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.bypassReason'
# Expected:
# "low_context"
```

### Test Case 2D: Forked Session Prevention (Recursion)

**Steps**:
1. Manually trigger hook in forked session context
2. Simulate `permission_mode: "fork"` in stdin

**Expected Outcome**:
- Bypass reason: `forked_session`
- No recursive improvement calls
- Processing completes in <100ms

**Validation**:
```bash
# This is tested via unit tests, not manual scenario
# Unit test mocks stdin with permission_mode: "fork"
```

---

## Scenario 3: Context Injection - Tools and Capabilities (US3)

**Goal**: Validate that available tools, skills, and capabilities are detected and injected into improvements.

**Success Criteria**: SC-005

### Test Case 3A: Tool Detection

**Steps**:
1. Submit prompt about file operations: `"show me the config"`
2. Observe improved prompt

**Expected Outcome**:
- Context includes mention of available tools: Read, Write, Edit
- Improved prompt suggests using Read tool for viewing config
- Log shows `contextSources` includes `"tools"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources'
# Expected:
# ["tools", ...]
```

### Test Case 3B: Skill and Agent Matching

**Steps**:
1. Submit prompt with keyword: `"help with typescript errors"`
2. Observe improved prompt

**Expected Outcome**:
- Context suggests consulting `typescript-expert` agent if available
- Improved prompt mentions TypeScript skill capabilities
- Log shows `contextSources` includes `"skills"` and/or `"agents"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep -i "typescript"
# Should mention typescript-expert or TypeScript skill
```

---

## Scenario 4: Git Context Enrichment (US4)

**Goal**: Validate that git context (branch, commits, changes) is gathered and injected.

**Success Criteria**: SC-005

**Prerequisites**: Run in a git repository with commits and changes

### Test Case 4A: Branch and Commit Context

**Steps**:
1. Ensure you're on a feature branch with recent commits
   ```bash
   git checkout -b feature/test-auth
   git commit --allow-empty -m "feat(auth): add JWT validation"
   git commit --allow-empty -m "test(auth): add token expiry tests"
   ```
2. Submit prompt: `"what's the current feature about?"`
3. Observe improved prompt

**Expected Outcome**:
- Context includes branch name: `feature/test-auth`
- Context includes recent commit messages
- Improved prompt references authentication work
- Log shows `contextSources` includes `"git"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep -i "feature/test-auth"
# Should mention branch name
```

### Test Case 4B: Staged Files Context

**Steps**:
1. Stage files:
   ```bash
   touch src/auth.ts tests/auth.spec.ts
   git add src/auth.ts tests/auth.spec.ts
   ```
2. Submit prompt: `"help with the staged changes"`
3. Observe improved prompt

**Expected Outcome**:
- Context mentions staged files: `src/auth.ts`, `tests/auth.spec.ts`
- Improved prompt references these specific files
- Git operations complete within 2-second timeout

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep "auth.ts"
# Should mention the staged files
```

---

## Scenario 5: LSP Diagnostics Integration (US5)

**Goal**: Validate that LSP errors and warnings are detected and injected into relevant prompts.

**Success Criteria**: SC-005

**Prerequisites**: LSP server configured and running (e.g., typescript-language-server)

### Test Case 5A: Error Injection for Debugging Prompts

**Steps**:
1. Create file with intentional TypeScript errors:
   ```typescript
   // src/test.ts
   const x: number = "hello"; // Type error
   function test() {
     return undefinedVar; // Undefined variable
   }
   ```
2. Wait for LSP diagnostics to populate
3. Submit prompt: `"fix the type errors"`
4. Observe improved prompt

**Expected Outcome**:
- Context includes LSP diagnostics (file, line, error message)
- Maximum 5 diagnostics injected (most relevant)
- Errors prioritised over warnings
- Log shows `contextSources` includes `"lsp"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep -i "error"
# Should mention specific type errors from LSP
```

### Test Case 5B: No LSP Injection for Non-Debugging Prompts

**Steps**:
1. Keep same file with errors
2. Submit prompt: `"implement a new feature for user profiles"`
3. Observe improved prompt

**Expected Outcome**:
- LSP diagnostics NOT injected (prompt not about fixing issues)
- Context focuses on other sources (git, spec, etc.)
- Log shows `contextSources` does NOT include `"lsp"` (or LSP gathering skipped)

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["lsp"])'
# Expected: false (or null if skipped)
```

---

## Scenario 6: Specification Awareness (US6)

**Goal**: Validate that .specify/ directory content is parsed and injected when relevant.

**Success Criteria**: SC-005

**Prerequisites**: `.specify/` directory with spec.md, plan.md, tasks.md

### Test Case 6A: Spec Context for Implementation Prompts

**Steps**:
1. Create specification:
   ```bash
   mkdir -p .specify/specs/feature/001-auth
   echo "# User Story: Implement JWT authentication" > .specify/specs/feature/001-auth/spec.md
   ```
2. Submit prompt: `"help with the authentication implementation"`
3. Observe improved prompt

**Expected Outcome**:
- Context includes relevant user stories from spec.md
- Acceptance criteria injected if applicable
- Log shows `contextSources` includes `"spec"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep -i "jwt"
# Should reference JWT authentication from spec
```

### Test Case 6B: Graceful Skip Without Specifications

**Steps**:
1. Navigate to project without `.specify/` directory
2. Submit any prompt
3. Observe processing

**Expected Outcome**:
- Plugin continues processing without spec context
- No errors logged for missing `.specify/`
- Log shows `contextSources` does NOT include `"spec"`
- Other context sources still work

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["spec"])'
# Expected: false
```

---

## Scenario 7: Memory Plugin Integration (US7)

**Goal**: Validate integration with claude-memory-plugin when installed.

**Success Criteria**: SC-009

**Prerequisites**: claude-memory-plugin installed (optional)

### Test Case 7A: Memory Matching

**Steps**:
1. Install claude-memory-plugin and create test memories:
   ```bash
   # Assuming memory plugin installed
   # Create memories about authentication
   ```
2. Submit prompt: `"implement authentication"`
3. Observe improved prompt

**Expected Outcome**:
- Context includes relevant memories (title/tag matching)
- Top 3-5 most relevant memories suggested
- Log shows `contextSources` includes `"memory"`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep -i "memory"
# Should reference relevant memories
```

### Test Case 7B: Graceful Degradation Without Memory Plugin

**Steps**:
1. Ensure claude-memory-plugin NOT installed
2. Submit any prompt
3. Observe processing

**Expected Outcome**:
- Plugin continues processing without memory context
- No errors logged for missing memory plugin
- Log shows `contextSources` does NOT include `"memory"`
- Other context sources still work

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["memory"])'
# Expected: false
```

---

## Scenario 8: Session Context with Compaction Detection (US8)

**Goal**: Validate session context usage and compaction threshold detection.

**Success Criteria**: SC-006

### Test Case 8A: Session Context Usage

**Steps**:
1. Start new conversation with multiple turns
2. Build context across several messages
3. Submit prompt referencing prior context: `"continue with that approach"`
4. Observe improved prompt

**Expected Outcome**:
- Session forked to access conversation history
- Vague reference ("that approach") clarified using prior context
- Log shows `contextSources` includes `"session"`
- Session forking timeout: <10 seconds

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["session"])'
# Expected: true (if session context enabled in config)
```

### Test Case 8B: Compaction Threshold Bypass

**Steps**:
1. Engage in long conversation until context >95% used
2. Submit any prompt
3. Observe bypass

**Expected Outcome**:
- Bypass reason: `low_context`
- Session context NOT gathered (would waste resources)
- Prompt passed through unchanged
- Processing completes in <100ms

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.bypassReason'
# Expected: "low_context"
```

---

## Scenario 9: XML Tag Structuring (US9)

**Goal**: Validate that XML tags are applied appropriately for complex prompts.

**Success Criteria**: SC-008

### Test Case 9A: XML Tags for Complex Prompts

**Steps**:
1. Submit complex multi-faceted prompt:
   ```
   I need to implement user authentication with JWT tokens, handle refresh tokens, ensure security best practices, and write comprehensive tests. The output should be production-ready code with documentation. For example, similar to how Auth0 handles it.
   ```
2. Observe improved prompt

**Expected Outcome**:
- XML tags applied: `<task>`, `<context>`, `<constraints>`, `<output_format>`, `<examples>`
- Tags structure the multi-faceted request clearly
- Each concern separated into appropriate tag
- Log shows `appliedTags` array populated

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep "<task>"
# Should contain XML tags
```

### Test Case 9B: No XML Tags for Simple Prompts

**Steps**:
1. Submit simple, clear prompt: `"What files are in this directory?"`
2. Observe improvement

**Expected Outcome**:
- Classification: likely NONE or SIMPLE
- XML tags NOT applied (would add unnecessary verbosity)
- Prompt either unchanged or minimally enhanced
- Log shows `appliedTags` empty or null

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.improvedPrompt' | grep "<task>"
# Should NOT contain XML tags
```

---

## Scenario 10: Configuration Management (US10)

**Goal**: Validate configuration loading and behaviour customisation.

**Success Criteria**: SC-010

### Test Case 10A: Custom Configuration

**Steps**:
1. Create config file:
   ```bash
   mkdir -p ~/.claude
   cat > ~/.claude/prompt-improver-config.json <<EOF
   {
     "enabled": true,
     "shortPromptThreshold": 5,
     "integrations": {
       "git": true,
       "lsp": false,
       "spec": true,
       "memory": true,
       "session": false
     }
   }
   EOF
   ```
2. Submit 7-token prompt: `"check the code quality please"`
3. Observe processing

**Expected Outcome**:
- Prompt NOT bypassed (threshold reduced from 10 to 5)
- LSP integration skipped (disabled in config)
- Session context skipped (disabled in config)
- Other integrations active

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["lsp", "session"])'
# Expected: false (both disabled)
```

### Test Case 10B: Disable Plugin

**Steps**:
1. Update config: `{ "enabled": false }`
2. Submit any prompt
3. Observe processing

**Expected Outcome**:
- Bypass reason: `plugin_disabled`
- All prompts pass through unchanged
- Processing completes in <100ms

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.bypassReason'
# Expected: "plugin_disabled"
```

---

## Scenario 11: Logging and Transparency (US11)

**Goal**: Validate that all processing is logged and visible to users.

**Success Criteria**: SC-010

### Test Case 11A: Log Entry Validation

**Steps**:
1. Submit any prompt that gets improved
2. Check log file

**Expected Outcome**:
- Log entry created at `~/.claude/logs/prompt-improver-latest.log`
- JSON format includes all required fields:
  - `timestamp`, `originalPrompt`, `improvedPrompt`
  - `classification`, `modelUsed`, `totalLatency`
  - `contextSources`, `conversationId`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq 'keys'
# Expected: ["timestamp", "originalPrompt", "improvedPrompt", "classification", "bypassReason", "modelUsed", "totalLatency", "contextSources", "conversationId"]
```

### Test Case 11B: Improved Prompt Display

**Steps**:
1. Submit prompt that gets improved
2. Observe stdout before execution

**Expected Outcome**:
- Improved prompt displayed to user via stdout
- Clear indication that improvement occurred
- User can see what will actually be sent to Claude

**Validation**:
```bash
# Manual observation: improved prompt should appear in terminal before Claude's response
```

---

## Scenario 12: Error Handling and Graceful Degradation

**Goal**: Validate that all failures result in passthrough, never blocking prompts.

**Success Criteria**: SC-004, SC-005

### Test Case 12A: Classification API Failure

**Steps**:
1. Simulate classification timeout (mock or network issue)
2. Submit prompt

**Expected Outcome**:
- Bypass reason: `classification_failed`
- Prompt passed through unchanged
- Error logged for debugging
- User prompt never blocked

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.bypassReason'
# Expected: "classification_failed"
```

### Test Case 12B: Context Gathering Timeout

**Steps**:
1. Simulate slow git operation (mock or large repo)
2. Submit prompt

**Expected Outcome**:
- Git context gathering times out after 2 seconds
- Other context sources continue successfully
- Improvement proceeds with available context
- Log shows git NOT in `contextSources`

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.contextSources | contains(["git"])'
# Expected: false (timed out)
```

### Test Case 12C: Improvement API Failure

**Steps**:
1. Simulate improvement timeout or API error
2. Submit prompt

**Expected Outcome**:
- Bypass reason: `improvement_failed`
- Prompt passed through unchanged
- Error logged for debugging
- Classification succeeded but improvement fell back

**Validation**:
```bash
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 1 | jq '.classification, .bypassReason'
# Expected:
# "COMPLEX" (or "SIMPLE")
# "improvement_failed"
```

---

## Performance Benchmarks

### Expected Latencies (90th percentile)

| Operation | Target | How to Measure |
|-----------|--------|----------------|
| Bypass detection | <100ms | Check `totalLatency` for bypassed prompts |
| Classification | <5s | Check classification latency in logs |
| Simple improvement | <30s | Check `totalLatency` for SIMPLE prompts |
| Complex improvement | <60s | Check `totalLatency` for COMPLEX prompts |
| Context gathering per source | <2s | Mock individual sources, measure timeout |

**Validation Query**:
```bash
# Calculate average latencies from last 100 log entries
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 100 | jq -s 'group_by(.classification) | map({classification: .[0].classification, avgLatency: (map(.totalLatency) | add / length)})'
```

---

## Troubleshooting Guide

### Issue: Prompts not being improved

**Diagnosis**:
```bash
# Check if plugin enabled
cat ~/.claude/prompt-improver-config.json | jq '.enabled'

# Check recent bypass reasons
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 10 | jq '.bypassReason'
```

**Solutions**:
- Ensure plugin enabled in config
- Check if prompts too short (increase threshold)
- Verify Claude API access working

### Issue: High latency

**Diagnosis**:
```bash
# Check latency breakdown
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 10 | jq '.classification, .totalLatency'
```

**Solutions**:
- Disable slow integrations (git, session) in config
- Reduce context sources
- Check network connectivity to Claude API

### Issue: Context not injected

**Diagnosis**:
```bash
# Check which sources actually contributed
cat ~/.claude/logs/prompt-improver-latest.log | tail -n 10 | jq '.contextSources'
```

**Solutions**:
- Verify integrations enabled in config
- Check prerequisites (git repo, LSP configured, .specify/ exists)
- Review error logs for source failures

---

**Quickstart Version**: 1.0.0 | **Status**: Draft | **Created**: 2026-01-18

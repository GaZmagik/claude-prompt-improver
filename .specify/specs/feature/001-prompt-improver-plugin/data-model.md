# Data Model: Claude Prompt Improver Plugin

**Purpose**: Define entities, relationships, and data structures for the prompt improvement system.

**Date**: 2026-01-18

---

## Entity: Prompt

**Description**: The original user input submitted to Claude Code before any improvement processing.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| originalText | string | Yes | 1-200000 chars | Raw user prompt as submitted |
| tokenCount | number | Yes | ≥0 | Approximate token count (whitespace-split heuristic) |
| submittedAt | Date | Yes | ISO 8601 | Timestamp when prompt was submitted |
| conversationId | string | Yes | UUID format | Conversation this prompt belongs to |
| messageIndex | number | Yes | ≥0 | Position in conversation history |

**Relationships**:
- **TransformsInto** ImprovedPrompt (1:0..1) - May produce improved version or pass through unchanged
- **Receives** Classification (1:1) - Always classified, even if bypassed (classification="NONE")
- **MayTrigger** BypassDecision (1:0..1) - If bypass conditions met

**State Transitions**:
```
Submitted → Classified → [Bypassed|Improved] → Executed
```

**Examples**:
```typescript
const prompt: Prompt = {
  originalText: "fix the bug",
  tokenCount: 3,
  submittedAt: new Date("2026-01-18T22:00:00Z"),
  conversationId: "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p",
  messageIndex: 42
};
```

---

## Entity: ImprovedPrompt

**Description**: The enhanced version of the user's prompt after classification and improvement processing.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| improvedText | string | Yes | 1-200000 chars | Enhanced prompt text |
| originalPromptId | string | Yes | References Prompt | Link to original prompt |
| appliedTags | string[] | No | XML tag names | List of XML tags applied (e.g., ["task", "context"]) |
| injectedContext | ContextSource[] | No | 0-7 sources | Which context sources contributed to improvement |
| modelUsed | "haiku" \| "sonnet" | Yes | Enum | Which Claude model performed improvement |
| improvementLatency | number | Yes | ≥0 ms | Time taken for improvement (milliseconds) |
| preservedIntent | boolean | Yes | true/false | Validation flag (manual review or automated check) |
| createdAt | Date | Yes | ISO 8601 | Timestamp when improvement completed |

**Relationships**:
- **DerivedFrom** Prompt (1:1) - Always originates from one prompt
- **Includes** Context (0:many) - May include context from multiple sources
- **UsedClassification** Classification (1:1) - Improvement strategy based on classification

**Validation Rules**:
- `improvedText` must preserve keywords from original prompt
- `injectedContext` length ≤7 (max number of context sources)
- `appliedTags` only contains valid XML tag names: "task", "context", "constraints", "output_format", "examples"

**Examples**:
```typescript
const improvedPrompt: ImprovedPrompt = {
  improvedText: `<task>
Investigate and fix the bug in the authentication module.
</task>

<context>
Recent commits show work on JWT token refresh logic.
LSP reports error in src/auth.ts line 45: "Property 'exp' does not exist on type 'JwtPayload'".
Current branch: feature/auth-refactor
</context>

<constraints>
- Maintain backward compatibility with existing token format
- Ensure fix doesn't break existing tests
</constraints>`,
  originalPromptId: "prompt-uuid-123",
  appliedTags: ["task", "context", "constraints"],
  injectedContext: ["git", "lsp"],
  modelUsed: "sonnet",
  improvementLatency: 4200,
  preservedIntent: true,
  createdAt: new Date("2026-01-18T22:00:04Z")
};
```

---

## Entity: Classification

**Description**: The assessment of a prompt's improvement potential and complexity level.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| level | "NONE" \| "SIMPLE" \| "COMPLEX" | Yes | Enum | Classification category |
| reasoning | string | Yes | 10-500 chars | Explanation of classification decision |
| confidence | number | No | 0.0-1.0 | Model's confidence in classification (optional) |
| modelUsed | "haiku" | Yes | Fixed value | Always uses Haiku for cost-effectiveness |
| classificationLatency | number | Yes | ≥0 ms | Time taken for classification (milliseconds) |
| promptId | string | Yes | References Prompt | Link to classified prompt |
| classifiedAt | Date | Yes | ISO 8601 | Timestamp when classification completed |

**Relationships**:
- **Classifies** Prompt (1:1) - Each prompt receives exactly one classification
- **Determines** ImprovementStrategy (1:1) - Classification level drives improvement approach

**Classification Criteria**:
- **NONE**: Well-structured, clear, specific. No improvement needed.
  - Examples: "Read the file at src/auth.ts and explain the JWT validation logic"
  - Characteristics: Specific file paths, clear action verbs, sufficient context

- **SIMPLE**: Moderately unclear or could benefit from minor enhancements.
  - Examples: "help with testing", "check the database code"
  - Characteristics: Vague scope, missing details, but core intent clear

- **COMPLEX**: Vague, multi-faceted, or requires significant restructuring.
  - Examples: "fix the bug", "make it better", "something's wrong"
  - Characteristics: No specifics, multiple possible interpretations, requires clarification

**Examples**:
```typescript
const classification: Classification = {
  level: "COMPLEX",
  reasoning: "Prompt is vague ('the bug') without specifying which bug, what symptoms, or where to look. Requires clarification questions.",
  confidence: 0.92,
  modelUsed: "haiku",
  classificationLatency: 1200,
  promptId: "prompt-uuid-123",
  classifiedAt: new Date("2026-01-18T22:00:01Z")
};
```

---

## Entity: Context

**Description**: Information gathered from various sources to enrich prompt improvements.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| source | ContextSource | Yes | Enum | Which integration provided this context |
| content | string | Yes | 1-5000 chars | The actual context data |
| relevanceScore | number | No | 0.0-1.0 | How relevant this context is to the prompt (optional) |
| gatheredAt | Date | Yes | ISO 8601 | Timestamp when context was gathered |
| gatheringLatency | number | Yes | ≥0 ms | Time taken to gather this context |
| promptId | string | Yes | References Prompt | Link to prompt this context enriches |

**ContextSource Enum**:
```typescript
type ContextSource =
  | "tools"        // Available Claude Code tools (Read, Write, Edit, etc.)
  | "skills"       // Available skills (memory, typescript-expert, etc.)
  | "agents"       // Suggested agents based on keywords
  | "git"          // Git branch, commits, changes
  | "lsp"          // LSP diagnostics (errors/warnings)
  | "spec"         // Specification files (.specify/)
  | "memory";      // Memory plugin memories
  | "session";     // Session conversation history
```

**Relationships**:
- **EnrichesPrompt** Prompt (many:1) - Multiple context items for one prompt
- **InjectedInto** ImprovedPrompt (many:1) - Multiple contexts combined in improvement

**Gathering Rules**:
- Each source has 2-second timeout (except classification/improvement)
- Failures logged but don't block other sources
- Empty context (no data found) is valid and non-blocking

**Examples**:
```typescript
const gitContext: Context = {
  source: "git",
  content: `Branch: feature/auth-refactor
Recent commits:
- a1b2c3d: feat(auth): implement JWT refresh token rotation
- e4f5g6h: fix(auth): handle expired tokens gracefully
- i7j8k9l: test(auth): add token expiry test cases

Changed files:
M src/auth.ts
M tests/auth.spec.ts`,
  relevanceScore: 0.85,
  gatheredAt: new Date("2026-01-18T22:00:02Z"),
  gatheringLatency: 340,
  promptId: "prompt-uuid-123"
};

const lspContext: Context = {
  source: "lsp",
  content: `Diagnostics:
[ERROR] src/auth.ts:45 - Property 'exp' does not exist on type 'JwtPayload'
[ERROR] src/auth.ts:67 - Type 'string | undefined' is not assignable to type 'string'
[WARN] src/auth.ts:23 - 'refreshToken' is declared but never used`,
  relevanceScore: 0.95,
  gatheredAt: new Date("2026-01-18T22:00:02Z"),
  gatheringLatency: 180,
  promptId: "prompt-uuid-123"
};
```

---

## Entity: Configuration

**Description**: User-defined settings controlling plugin behaviour.

**Fields**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| enabled | boolean | No | true | Master toggle for plugin |
| shortPromptThreshold | number | No | 10 | Token count below which prompts bypass (≤threshold) |
| compactionThreshold | number | No | 5 | Context availability % below which processing skips |
| defaultSimpleModel | "haiku" \| "sonnet" | No | "haiku" | Model for SIMPLE improvements |
| defaultComplexModel | "haiku" \| "sonnet" | No | "sonnet" | Model for COMPLEX improvements |
| integrations | IntegrationToggles | No | all true | Enable/disable individual integrations |
| logging | LoggingConfig | No | see below | Logging behaviour settings |

**IntegrationToggles**:
```typescript
interface IntegrationToggles {
  git: boolean;       // Default: true
  lsp: boolean;       // Default: true
  spec: boolean;      // Default: true
  memory: boolean;    // Default: true
  session: boolean;   // Default: true
}
```

**LoggingConfig**:
```typescript
interface LoggingConfig {
  enabled: boolean;           // Default: true
  logFilePath: string;        // Default: ".claude/logs/prompt-improver-latest.log"
  maxLogSizeMB: number;       // Default: 10
  maxLogAgeDays: number;      // Default: 7
  displayImprovedPrompt: boolean; // Default: true (show in stdout before execution)
}
```

**Relationships**:
- **Controls** BypassDecision (1:many) - Configuration affects bypass logic
- **Controls** ContextGathering (1:many) - Integration toggles determine which contexts gathered

**Validation Rules**:
- `shortPromptThreshold` ≥1 and ≤100
- `compactionThreshold` ≥0 and ≤100
- `logFilePath` must be valid filesystem path
- `maxLogSizeMB` ≥1 and ≤1000
- `maxLogAgeDays` ≥1 and ≤365

**File Location**: `.claude/prompt-improver-config.json` (optional, uses defaults if missing)

**Examples**:
```typescript
const config: Configuration = {
  enabled: true,
  shortPromptThreshold: 10,
  compactionThreshold: 5,
  defaultSimpleModel: "haiku",
  defaultComplexModel: "sonnet",
  integrations: {
    git: true,
    lsp: true,
    spec: true,
    memory: true,
    session: false  // Disabled to avoid latency
  },
  logging: {
    enabled: true,
    logFilePath: ".claude/logs/prompt-improver-latest.log",
    maxLogSizeMB: 10,
    maxLogAgeDays: 7,
    displayImprovedPrompt: true
  }
};
```

---

## Entity: BypassDecision

**Description**: Record of why a prompt was bypassed without improvement.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| reason | BypassReason | Yes | Enum | Why bypass occurred |
| promptId | string | Yes | References Prompt | Link to bypassed prompt |
| detectedAt | Date | Yes | ISO 8601 | Timestamp when bypass detected |
| detectionLatency | number | Yes | ≥0 ms | Time taken to detect bypass condition |

**BypassReason Enum**:
```typescript
type BypassReason =
  | "short_prompt"          // Token count ≤ threshold
  | "explicit_skip"         // Contains #skip tag
  | "low_context"           // Available context < 5%
  | "forked_session"        // Running in forked session (recursion prevention)
  | "plugin_disabled"       // Configuration.enabled = false
  | "classification_failed" // Classification API failed, defaulting to passthrough
  | "improvement_failed";   // Improvement API failed, falling back to original
```

**Relationships**:
- **Bypasses** Prompt (1:1) - Each bypass decision relates to one prompt
- **AlternativeTo** ImprovedPrompt (1:0) - When bypassed, no improved prompt generated

**Bypass Priority** (first match wins):
1. `plugin_disabled` - Check configuration first
2. `forked_session` - Prevent recursion immediately
3. `low_context` - Preserve resources
4. `explicit_skip` - Honour user request
5. `short_prompt` - Avoid processing confirmations
6. `classification_failed` - API failures
7. `improvement_failed` - Fallback after failed improvement

**Examples**:
```typescript
const bypassDecision: BypassDecision = {
  reason: "short_prompt",
  promptId: "prompt-uuid-456",
  detectedAt: new Date("2026-01-18T22:01:00Z"),
  detectionLatency: 2
};

const explicitSkipBypass: BypassDecision = {
  reason: "explicit_skip",
  promptId: "prompt-uuid-789",
  detectedAt: new Date("2026-01-18T22:02:00Z"),
  detectionLatency: 5
};
```

---

## Entity: LogEntry

**Description**: Record of prompt processing for transparency and debugging.

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| timestamp | Date | Yes | ISO 8601 | When processing occurred |
| originalPrompt | string | Yes | 1-200000 chars | User's original prompt |
| improvedPrompt | string | No | 1-200000 chars | Enhanced prompt (null if bypassed) |
| classification | ClassificationLevel | Yes | Enum | NONE/SIMPLE/COMPLEX |
| bypassReason | BypassReason | No | Enum | Why bypassed (null if processed) |
| modelUsed | "haiku" \| "sonnet" | No | Enum | Model for improvement (null if bypassed) |
| totalLatency | number | Yes | ≥0 ms | Total processing time (bypass detection → output) |
| contextSources | ContextSource[] | No | 0-7 sources | Which sources contributed context |
| conversationId | string | Yes | UUID | Conversation identifier |

**Relationships**:
- **Logs** Prompt (1:1) - One log entry per prompt
- **References** Classification (1:1) - Always includes classification
- **References** ImprovedPrompt (1:0..1) - Includes improvement if not bypassed

**JSON Format** (for log file):
```json
{
  "timestamp": "2026-01-18T22:00:05.123Z",
  "originalPrompt": "fix the bug",
  "improvedPrompt": "<task>Investigate and fix the bug...</task>",
  "classification": "COMPLEX",
  "bypassReason": null,
  "modelUsed": "sonnet",
  "totalLatency": 4532,
  "contextSources": ["git", "lsp"],
  "conversationId": "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p"
}
```

**Log Rotation Strategy**:
- When log file exceeds `maxLogSizeMB`, truncate to last `maxLogAgeDays` of entries
- Check log size on plugin startup
- Simple rotation: keep most recent entries, discard oldest

**Examples**:
```typescript
const logEntry: LogEntry = {
  timestamp: new Date("2026-01-18T22:00:05.123Z"),
  originalPrompt: "fix the bug",
  improvedPrompt: "<task>Investigate and fix the bug in the authentication module...</task>",
  classification: "COMPLEX",
  bypassReason: null,
  modelUsed: "sonnet",
  totalLatency: 4532,
  contextSources: ["git", "lsp"],
  conversationId: "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p"
};

const bypassedLogEntry: LogEntry = {
  timestamp: new Date("2026-01-18T22:01:00.045Z"),
  originalPrompt: "yes",
  improvedPrompt: null,
  classification: "NONE",
  bypassReason: "short_prompt",
  modelUsed: null,
  totalLatency: 2,
  contextSources: [],
  conversationId: "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p"
};
```

---

## Relationships Diagram

```
┌──────────────┐
│   Prompt     │
└──────┬───────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────┐
│Classification│  │BypassDecision│
└──────┬───────┘  └──────────────┘
       │
       │ (if not bypassed)
       ▼
┌──────────────┐
│ImprovedPrompt│◄───┐
└──────────────┘    │
                    │
              ┌─────┴──────┐
              │  Context   │ (0..7 sources)
              └────────────┘

┌──────────────┐
│ Configuration│ (controls all processing)
└──────────────┘

┌──────────────┐
│  LogEntry    │ (records everything)
└──────────────┘
```

---

## State Machine: Prompt Processing Flow

```
[Prompt Submitted]
       │
       ▼
[Load Configuration]
       │
       ├──[enabled=false]──→ [Bypass: plugin_disabled]
       │
       ▼
[Check Forked Session]
       │
       ├──[is forked]──→ [Bypass: forked_session]
       │
       ▼
[Check Context Availability]
       │
       ├──[<5% available]──→ [Bypass: low_context]
       │
       ▼
[Check #skip Tag]
       │
       ├──[has #skip]──→ [Bypass: explicit_skip]
       │
       ▼
[Count Tokens]
       │
       ├──[≤threshold]──→ [Bypass: short_prompt]
       │
       ▼
[Classify Prompt] (Haiku, 5s timeout)
       │
       ├──[failed]──→ [Bypass: classification_failed]
       │
       ├──[NONE]──→ [Pass Through Unchanged]
       │
       ▼
[Gather Context] (parallel, 2s per source)
       │
       ▼
[Improve Prompt]
  ├──[SIMPLE]──→ [Haiku, 30s timeout]
  └──[COMPLEX]──→ [Sonnet, 60s timeout]
       │
       ├──[failed]──→ [Bypass: improvement_failed]
       │
       ▼
[Apply XML Tags] (if COMPLEX)
       │
       ▼
[Display Improved Prompt] (stdout)
       │
       ▼
[Log Entry]
       │
       ▼
[Execute Improved Prompt]
```

---

## Validation Scenarios

### Scenario 1: Successful Complex Improvement
1. User submits: "fix the bug"
2. Token count: 3 (passes bypass)
3. Classification: COMPLEX
4. Context gathered: git (branch, commits), lsp (errors)
5. Improvement: Sonnet restructures with XML tags
6. Output: Structured prompt with `<task>`, `<context>`, `<constraints>`
7. Log entry created with all details

### Scenario 2: Bypassed Short Prompt
1. User submits: "yes"
2. Token count: 1 (≤10 threshold)
3. Bypass decision: `short_prompt`
4. Output: Original "yes" passed through
5. Log entry created with bypass reason

### Scenario 3: Failed Classification Fallback
1. User submits: "Implement user authentication"
2. Classification API times out (>5s)
3. Bypass decision: `classification_failed`
4. Output: Original prompt passed through
5. Log entry created with failure details
6. Error logged for debugging

---

**Data Model Version**: 1.0.0 | **Status**: Draft | **Created**: 2026-01-18

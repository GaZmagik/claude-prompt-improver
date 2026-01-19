---
user_stories:
  - id: "US1"
    title: "Automatic Prompt Classification and Improvement"
    priority: "P1"
    independently_testable: true
  - id: "US2"
    title: "Smart Bypass Mechanisms"
    priority: "P1"
    independently_testable: true
  - id: "US3"
    title: "Context Injection - Tools and Capabilities"
    priority: "P1"
    independently_testable: true
  - id: "US4"
    title: "Git Context Enrichment"
    priority: "P2"
    independently_testable: true
  - id: "US5"
    title: "LSP Diagnostics Integration"
    priority: "P2"
    independently_testable: true
  - id: "US6"
    title: "Specification Awareness"
    priority: "P2"
    independently_testable: true
  - id: "US7"
    title: "Memory Plugin Integration"
    priority: "P2"
    independently_testable: true
  - id: "US8"
    title: "Session Context with Compaction Detection"
    priority: "P2"
    independently_testable: true
  - id: "US9"
    title: "XML Tag Structuring"
    priority: "P2"
    independently_testable: true
  - id: "US10"
    title: "Configuration Management"
    priority: "P2"
    independently_testable: true
  - id: "US11"
    title: "Logging and Transparency"
    priority: "P3"
    independently_testable: true
  - id: "US12"
    title: "Plugin Documentation"
    priority: "P3"
    independently_testable: true
---

# Feature Specification: Claude Prompt Improver Plugin

**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Create a Claude Code plugin named 'claude-prompt-improver' for the GaZmagik/enhance marketplace that automatically improves user prompts before they reach the main Claude session."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Prompt Classification and Improvement (Priority: P1)

As a Claude Code user, I want my prompts automatically analysed and improved based on their complexity so that I receive better, more contextual responses without manual effort.

**Why this priority**: This is the core value proposition of the plugin. Without automatic classification and improvement, the plugin has no purpose. This story alone delivers immediate user value by enhancing prompt quality transparently.

**Independent Test**: Can be fully tested by submitting various prompts (simple questions, complex tasks, well-structured requests) and verifying that each receives appropriate classification (NONE/SIMPLE/COMPLEX) and corresponding improvement. Delivers standalone value even without context injection features.

**Acceptance Scenarios**:

1. **Given** a vague user prompt "fix the bug", **When** the plugin processes it, **Then** it is classified as COMPLEX and restructured by Claude Sonnet to include specific questions about which bug, what symptoms, and what context is needed.

2. **Given** a well-structured prompt "Please review the authentication logic in src/auth.ts and suggest improvements for security best practices", **When** the plugin processes it, **Then** it is classified as NONE and passed through unchanged.

3. **Given** a moderately unclear prompt "help with testing", **When** the plugin processes it, **Then** it is classified as SIMPLE and enhanced by Claude Haiku to specify what type of testing (unit, integration, e2e) and what needs testing.

4. **Given** any prompt being classified, **When** classification occurs, **Then** it completes within 5 seconds using Claude Haiku model.

5. **Given** a classified prompt requiring improvement, **When** improvement is applied, **Then** the original intent and tone of the user's request are preserved in the enhanced version.

---

### User Story 2 - Smart Bypass Mechanisms (Priority: P1)

As a Claude Code user, I want certain prompts to bypass improvement processing automatically so that simple confirmations, explicit skip requests, and resource-constrained scenarios don't incur unnecessary latency or costs.

**Why this priority**: Essential for usability and performance. Without bypass logic, every "yes", "continue", or "ok" would trigger improvement processing, creating frustrating delays and wasted API calls. This protects user experience from degradation.

**Independent Test**: Can be fully tested by submitting prompts with `#skip` tags, short prompts (≤10 tokens), simulating low context availability (<5%), and running in forked sessions. Each bypass condition can be verified independently. Delivers standalone value by preventing processing overhead.

**Acceptance Scenarios**:

1. **Given** a user prompt containing the `#skip` tag anywhere in the text, **When** the plugin processes it, **Then** the `#skip` tag is removed and the prompt is passed through unchanged with reason "explicit skip requested" in additionalContext.

2. **Given** a short prompt of ≤10 tokens (e.g., "yes", "continue", "ok"), **When** the plugin processes it, **Then** it is automatically bypassed with reason "short prompt" in additionalContext.

3. **Given** a prompt submitted when available context is below 5%, **When** the plugin detects the compaction threshold via context info, **Then** processing is skipped entirely with reason "near compaction threshold" in additionalContext.

4. **Given** the plugin running in a forked session context, **When** it detects `permission_mode` indicating fork, **Then** all processing is bypassed with reason "forked session - recursion prevention" in additionalContext.

5. **Given** any bypass condition being met, **When** the prompt is passed through, **Then** the bypass detection completes in under 100ms.

---

### User Story 3 - Context Injection - Tools and Capabilities (Priority: P1)

As a Claude Code user, I want my improved prompts enriched with information about available tools, skills, MCP servers, LSP servers, and relevant agents so that Claude understands what capabilities it has access to for completing my task.

**Why this priority**: Fundamental to making improvements contextually relevant. Without awareness of available tools and capabilities, improved prompts may suggest approaches that aren't available or miss suggesting built-in capabilities that could help. This makes improvements actionable.

**Independent Test**: Can be fully tested by mocking session context with various tool configurations, checking that relevant tools/skills/agents are injected into improved prompts. Works standalone without git/LSP/spec integration. Delivers value by making Claude aware of its capabilities.

**Acceptance Scenarios**:

1. **Given** a prompt about file operations and the session has Read/Write/Edit tools available, **When** the prompt is improved, **Then** the improved version includes context noting these file manipulation capabilities are available.

2. **Given** a prompt about searching code and MCP servers for ripgrep/LSP are configured, **When** the prompt is improved, **Then** the improved version mentions Grep tool and LSP code intelligence capabilities.

3. **Given** a prompt containing keywords "typescript" or "react" and relevant agent skills exist, **When** the prompt is improved, **Then** the improved version suggests consulting the typescript-expert or react-specialist agent if available.

4. **Given** a prompt about memory/recall and the memory skill is available, **When** the prompt is improved, **Then** the improved version notes the ability to use memory commands for retrieval.

5. **Given** context gathering from session capabilities, **When** any source fails or times out, **Then** the plugin continues processing with available context and logs the failure without blocking the improvement.

---

### User Story 4 - Git Context Enrichment (Priority: P2)

As a Claude Code user working in a git repository, I want my prompts enriched with recent commits, current branch name, and file changes so that Claude understands what I'm currently working on without me having to explain it.

**Why this priority**: High value for developer workflows but not critical for basic functionality. The plugin delivers core value (US1-US3) without git integration. This enhances contextual awareness for development tasks but can be added incrementally.

**Independent Test**: Can be fully tested by setting up a git repository with commits and changes, verifying that git context is correctly extracted and injected into improved prompts. Works independently of other context sources. Delivers value for development-focused prompts.

**Acceptance Scenarios**:

1. **Given** a user working on branch `feature/auth-refactor` with 3 recent commits about authentication, **When** a prompt about "the current feature" is improved, **Then** the improved prompt includes the branch name and commit messages for context.

2. **Given** staged files `src/auth.ts` and `tests/auth.spec.ts`, **When** a prompt about testing is improved, **Then** the improved prompt notes these specific files are staged and may be relevant to the task.

3. **Given** the last 5 commits focused on database migrations, **When** a prompt mentioning "schema" or "database" is improved, **Then** the commit history is included to show recent database work.

4. **Given** a prompt in a repository with uncommitted changes to 10+ files, **When** git context is gathered, **Then** a summary of changed files is included (not full diffs) and git operations timeout after 2 seconds if slow.

5. **Given** a prompt in a directory that is not a git repository, **When** git context gathering occurs, **Then** the plugin gracefully skips git integration and continues with other context sources.

---

### User Story 5 - LSP Diagnostics Integration (Priority: P2)

As a Claude Code user with LSP servers active, I want current errors and warnings from my codebase automatically injected into prompts related to debugging or fixing issues so that Claude immediately knows what problems need attention.

**Why this priority**: Valuable for debugging workflows but not essential for general prompting. The plugin works without LSP integration. This enhances problem-solving prompts significantly but requires LSP to be configured and running.

**Independent Test**: Can be fully tested by mocking LSP diagnostic data, submitting prompts with keywords like "fix", "error", "bug", and verifying diagnostics are injected appropriately. Standalone feature that doesn't depend on other integrations. Delivers debugging assistance value.

**Acceptance Scenarios**:

1. **Given** 3 TypeScript errors in `src/types.ts` and a prompt "fix the type errors", **When** the prompt is improved, **Then** the specific error messages and line numbers are injected into the improved prompt.

2. **Given** 15 linting warnings and 2 compilation errors, **When** LSP diagnostics are gathered, **Then** errors are prioritised and a maximum of 5 most relevant diagnostics are included to avoid noise.

3. **Given** a prompt "why isn't this working?" and active LSP showing errors in the currently open file, **When** the prompt is improved, **Then** diagnostics from the current file are injected with higher priority than other files.

4. **Given** a prompt about implementing a new feature (no error-related keywords), **When** LSP diagnostics are available, **Then** they are NOT injected because the prompt isn't about fixing existing issues.

5. **Given** LSP server is not running or not configured, **When** diagnostic gathering is attempted, **Then** the plugin gracefully degrades and continues without LSP context, logging the unavailability.

---

### User Story 6 - Specification Awareness (Priority: P2)

As a Claude Code user following Specification-Driven Development, I want prompts automatically enriched with relevant specification context from `.specify/` directory so that implementation work stays aligned with documented requirements.

**Why this priority**: Highly valuable for SDD workflows but only applicable when specifications exist. The plugin functions fully without specification awareness. This ensures alignment with documented requirements when specs are present.

**Independent Test**: Can be fully tested by creating `.specify/` directory structure with spec.md, plan.md, and tasks.md files, then verifying that relevant content is extracted and injected based on prompt keywords. Independent feature. Delivers SDD workflow value.

**Acceptance Scenarios**:

1. **Given** a `.specify/specs/feature/001-auth/spec.md` exists with user stories, **When** a prompt mentions "authentication" or "auth", **Then** relevant user stories and acceptance criteria are extracted and included in the improved prompt.

2. **Given** a `plan.md` with technical tasks and a prompt about implementation approach, **When** the prompt is improved, **Then** the current plan context is injected to inform the implementation.

3. **Given** a `tasks.md` with frontmatter showing current task status and a prompt asking "what's next?", **When** the prompt is improved, **Then** the task list and current task are included in context.

4. **Given** multiple specification files in `.specify/` directory, **When** spec context is gathered, **Then** only files relevant to the prompt keywords are parsed (not all specs indiscriminately).

5. **Given** no `.specify/` directory exists in the project, **When** specification awareness gathering occurs, **Then** the plugin skips this integration gracefully without errors or delays.

---

### User Story 7 - Memory Plugin Integration (Priority: P2)

As a Claude Code user with the claude-memory-plugin installed, I want relevant memories (decisions, learnings, gotchas) suggested in my improved prompts so that Claude considers past context and avoids repeating mistakes.

**Why this priority**: Valuable enhancement for users with memory plugin but creates a dependency. The prompt improver must work standalone. This leverages existing memory infrastructure when available but isn't required for core functionality.

**Independent Test**: Can be fully tested by mocking the presence of claude-memory-plugin, creating test memory index.json files, and verifying that relevant memories are matched by keywords and injected. Optional integration that degrades gracefully. Delivers memory-aware improvement value.

**Acceptance Scenarios**:

1. **Given** claude-memory-plugin is installed and a memory titled "Authentication gotcha: JWT refresh tokens" exists, **When** a prompt about authentication is improved, **Then** this memory is suggested as relevant context.

2. **Given** memories tagged with "database" and "performance", **When** a prompt containing "slow queries" is improved, **Then** relevant tagged memories are matched and included.

3. **Given** decision memories about "Using Bun instead of Node.js" and a prompt asking about runtime choices, **When** the prompt is improved, **Then** the previous decision is surfaced to maintain consistency.

4. **Given** the memory plugin's `index.json` with 50+ memories, **When** memories are searched, **Then** only the top 3-5 most relevant matches are included to avoid overwhelming the context.

5. **Given** claude-memory-plugin is NOT installed, **When** memory integration is attempted, **Then** the plugin detects absence, skips memory gathering gracefully, and logs that memory integration is unavailable.

---

### User Story 8 - Session Context with Compaction Detection (Priority: P2)

As a Claude Code user, I want conversation history considered when improving prompts, but only when sufficient context remains available, so that improvements are contextually aware without triggering compaction or wasting resources.

**Why this priority**: Enhances improvement quality with conversation awareness but adds complexity and API costs. Must intelligently detect when context is scarce. Not critical for standalone prompts but valuable for multi-turn conversations.

**Independent Test**: Can be fully tested by forking sessions with varying context availability, simulating compaction thresholds, and verifying that session context is used when appropriate and skipped when resources are low. Standalone feature. Delivers conversation-aware improvements.

**Acceptance Scenarios**:

1. **Given** a multi-turn conversation about authentication with 60% context available, **When** a prompt "continue with that approach" is improved, **Then** the session is forked, conversation history informs the improvement, and the vague reference is clarified.

2. **Given** available context is below 5% (near compaction threshold), **When** a prompt is submitted, **Then** session context gathering is entirely skipped with reason "near compaction threshold" to preserve resources.

3. **Given** the plugin running in a forked session (detected via `permission_mode` in stdin), **When** prompt processing begins, **Then** all processing is bypassed immediately to prevent infinite recursion.

4. **Given** session forking for improvement takes longer than 10 seconds, **When** the timeout is reached, **Then** the improvement continues without session context rather than blocking indefinitely.

5. **Given** a brand new conversation with no history, **When** session context is attempted, **Then** the plugin detects empty context and continues improvement using only other context sources.

---

### User Story 9 - XML Tag Structuring (Priority: P2)

As a Claude Code user, I want improved prompts structured with Anthropic-recommended XML tags when appropriate so that complex requests are parsed more reliably by Claude.

**Why this priority**: Improves Claude's understanding of complex prompts but must be applied judiciously. Overuse creates verbosity without benefit. This is an enhancement to improvement quality, not a core requirement.

**Independent Test**: Can be fully tested by submitting complex prompts with multiple concerns and verifying that appropriate XML tags (`<task>`, `<context>`, `<constraints>`, `<output_format>`, `<examples>`) are applied. Standalone formatting feature. Delivers structured prompt value.

**Acceptance Scenarios**:

1. **Given** a complex prompt with a task description, constraints, and desired output format, **When** improved by Claude Sonnet, **Then** the structure uses `<task>`, `<constraints>`, and `<output_format>` XML tags appropriately.

2. **Given** a simple, clear prompt like "What files are in this directory?", **When** improved (if at all), **Then** XML tags are NOT added because they would create unnecessary verbosity.

3. **Given** a prompt with multiple examples of desired behaviour, **When** improved, **Then** an `<examples>` tag is used to clearly separate example content from the main request.

4. **Given** a prompt needing context injection from git/LSP/specs, **When** improved, **Then** injected context is wrapped in a `<context>` tag to separate it from the user's original task.

5. **Given** XML tag structuring being applied, **When** tags are added, **Then** they follow Anthropic's documented best practices and don't nest unnecessarily.

---

### User Story 10 - Configuration Management (Priority: P2)

As a Claude Code user, I want to configure prompt improver behaviour (enable/disable, thresholds, integrations) so that I can customise the plugin to my workflow preferences.

**Why this priority**: Essential for user control but can start with sensible defaults. Configuration enables personalisation without being required for initial value delivery. Can be implemented after core functionality proves valuable.

**Independent Test**: Can be fully tested by creating configuration files, modifying settings, and verifying that behaviour changes accordingly (e.g., disabling git integration, adjusting token thresholds). Standalone configuration system. Delivers customisation value.

**Acceptance Scenarios**:

1. **Given** configuration setting `enabled: false`, **When** any prompt is submitted, **Then** all processing is bypassed and prompts pass through unchanged.

2. **Given** configuration setting `shortPromptThreshold: 5` (tokens), **When** a 7-token prompt is submitted, **Then** it is NOT bypassed and proceeds to classification (default is 10).

3. **Given** configuration disabling git integration `integrations.git: false`, **When** prompts are improved, **Then** no git context gathering occurs even in a git repository.

4. **Given** configuration specifying `defaultModel: sonnet` for simple improvements, **When** a SIMPLE-classified prompt is improved, **Then** Claude Sonnet is used instead of default Haiku.

5. **Given** configuration changes made to plugin settings, **When** the plugin is restarted or a new session begins, **Then** the updated configuration is loaded and persists across sessions.

---

### User Story 11 - Logging and Transparency (Priority: P3)

As a Claude Code user, I want visibility into what improvements were made to my prompts so that I can understand, verify, and learn from the changes.

**Why this priority**: Important for trust and debugging but not required for core functionality. Users benefit from transparency, but the plugin delivers value even without detailed logging. Can be added after proving core value.

**Independent Test**: Can be fully tested by submitting prompts, checking that log files contain original prompts, improved prompts, classification levels, models used, and latency measurements. Standalone logging feature. Delivers transparency value.

**Acceptance Scenarios**:

1. **Given** any prompt that undergoes improvement, **When** processing completes, **Then** the improved prompt is displayed to the user via stdout before execution.

2. **Given** a prompt being processed, **When** improvement occurs, **Then** an entry is written to `.claude/logs/prompt-improver-latest.log` containing original prompt, improved prompt, classification level, model used, and timestamp.

3. **Given** a COMPLEX prompt improved by Sonnet taking 45 seconds, **When** logged, **Then** the latency (45s) is included in the log entry for performance monitoring.

4. **Given** a bypassed prompt (any bypass reason), **When** logged, **Then** the log includes bypass reason and original prompt but notes that no improvement occurred.

5. **Given** the log file growing large over time, **When** it reaches a certain size threshold, **Then** it is rotated or truncated to prevent unbounded growth (implementation detail for planning phase).

---

### User Story 12 - Plugin Documentation (Priority: P3)

As a potential user browsing GitHub or the GaZmagik/enhance marketplace, I want clear, comprehensive documentation so that I can understand what the plugin does, how to install it, and how to configure it.

**Why this priority**: Essential for adoption but not required for functionality. Documentation doesn't deliver runtime value but enables users to discover and use the plugin. Can be written after implementation proves the concept.

**Independent Test**: Can be fully tested by reviewing README.md for completeness (installation steps, configuration options, usage examples, troubleshooting). Documentation can be validated independently of code. Delivers adoption/onboarding value.

**Acceptance Scenarios**:

1. **Given** a user visiting the GitHub repository, **When** they read README.md, **Then** they understand the plugin's purpose (automatic prompt improvement) within the first paragraph.

2. **Given** a user wanting to install the plugin, **When** they follow README installation instructions, **Then** they can successfully install via `claude plugin install GaZmagik/claude-prompt-improver` or manual git clone.

3. **Given** a user wanting to configure behaviour, **When** they consult README, **Then** all configuration options are documented with their defaults and effects.

4. **Given** a user encountering issues, **When** they check README, **Then** a troubleshooting section addresses common problems (e.g., "prompts not being improved", "bypass not working").

5. **Given** README.md at repository root, **When** viewed, **Then** it includes badges for test status, version, and license for quick visibility of project health.

---

### Edge Cases

- **What happens when an empty prompt is submitted?** An empty prompt (0 tokens, whitespace-only, or null) should be bypassed with reason "short_prompt" since 0 ≤ 10 tokens. The plugin should not attempt classification or improvement on empty input.

- **What happens when multiple bypass conditions are met simultaneously?** The plugin should log the first detected bypass reason and exit early without checking remaining conditions (performance optimisation).

- **How does the system handle a prompt that is exactly 10 tokens?** Based on the "≤10 tokens" rule, a 10-token prompt is bypassed. The threshold is inclusive.

- **What if git operations hang or take too long?** All git operations must have a 2-second timeout. On timeout, git context gathering fails gracefully and improvement continues without git context.

- **What if the classification API call fails or returns an invalid response?** The plugin must default to NONE (pass through unchanged) to ensure user prompts are never blocked by plugin failures.

- **What if improved prompt is longer than the original and exceeds context limits?** This is a risk with complex improvements. The plugin should monitor improved prompt length and if it approaches context limits, fall back to SIMPLE improvement or pass through original.

- **What happens when memory plugin index.json is malformed or corrupted?** JSON parsing must be wrapped in try-catch. On parse failure, log the error and gracefully skip memory integration.

- **How does the plugin handle prompts in languages other than English?** Classification and improvement should work with any language Claude supports. No English-only constraints should be hardcoded.

- **What if the user's prompt contains XML-like tags that conflict with injected tags?** The improvement model should escape or handle existing XML tags appropriately to avoid parsing conflicts.

- **What if LSP diagnostics number in the hundreds?** The plugin must limit to the 5 most relevant diagnostics based on severity (errors first) and recency to avoid context bloat.

- **What happens when the plugin itself has a bug that causes it to crash?** Claude Code's plugin architecture should handle crashes gracefully, passing the prompt through unchanged and logging the error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST classify incoming prompts into three categories (NONE, SIMPLE, COMPLEX) using Claude Haiku for cost-effective assessment.

- **FR-002**: System MUST apply improvement strategy based on classification:
  - NONE: Pass prompt through unchanged
  - SIMPLE: Apply light improvements using Claude Haiku
  - COMPLEX: Apply comprehensive restructuring using Claude Sonnet

- **FR-003**: System MUST bypass all processing when:
  - Prompt contains `#skip` tag (tag removed before passthrough)
  - Prompt length is ≤10 tokens
  - Available context is below 5% (detected via `context_usage` field in hook stdin, calculated as: (max_context - used_context) / max_context * 100)
  - Plugin is running in a forked session (detected via `permission_mode: "default"` in hook stdin)

- **FR-004**: System MUST gather context from multiple sources:
  - Session tools and capabilities (Read, Write, Edit, Grep, Glob, Bash)
  - Available skills and agents (memory, typescript-expert, etc.)
  - MCP servers (ripgrep, LSP, etc.)
  - LSP servers and their current diagnostics
  - Git state (current branch, recent commits, staged/changed files)
  - Specification files (spec.md, plan.md, tasks.md from `.specify/`)
  - Memory plugin index (if claude-memory-plugin is installed)
  - Session conversation history (via fork, when context available)

- **FR-005**: System MUST handle all context gathering failures gracefully:
  - Timeout any single context source after 2 seconds
  - Continue improvement with available context if sources fail
  - Log failures for debugging
  - Never block prompt processing due to context gathering failures
  - Graceful degradation threshold: failures of ≤3 context sources are acceptable; ≥4 source failures triggers bypass with reason "insufficient_context"

- **FR-006**: System MUST use forked sessions for improvement API calls:
  - Invoke `claude --fork-session` for classification and improvement
  - Detect forked session context via `permission_mode` in stdin
  - Skip all processing when running in a forked session to prevent recursion

- **FR-007**: System MUST enforce timeouts at all stages:
  - Bypass detection: <100ms
  - Classification: 5 seconds maximum
  - Context gathering per source: 2 seconds maximum (sources gathered in parallel)
  - Simple improvement (Haiku): 30 seconds maximum
  - Complex improvement (Sonnet): 60 seconds maximum
  - Total hook execution: 90 seconds maximum (all operations within this budget; if budget exceeded, pass through original prompt)

- **FR-008**: System MUST structure improved prompts using Anthropic-recommended XML tags when appropriate:
  - `<task>`: Main request description
  - `<context>`: Injected context from various sources
  - `<constraints>`: Limitations or requirements
  - `<output_format>`: Expected response format
  - `<examples>`: Example inputs/outputs
  - Tags only applied when they genuinely improve clarity

- **FR-009**: System MUST preserve original prompt intent and tone:
  - Improvements enhance clarity but don't change user's goals
  - Formal/informal tone is maintained
  - User's specific terminology preserved where possible
  - Measurable proxy: improved prompt MUST contain ≥80% of keywords from original prompt (excluding stop words) AND maintain imperative/interrogative sentence structure

- **FR-010**: System MUST provide transparency:
  - Display improved prompt to user via stdout before execution
  - Log all processing to `.claude/logs/prompt-improver-latest.log`
  - Include original prompt, improved prompt, classification, model used, latency, and timestamp in logs

- **FR-011**: System MUST support configuration:
  - Enable/disable automatic improvement (default: enabled)
  - Token threshold for short prompt detection (default: 10)
  - Individual integration toggles (git, LSP, spec, memory, session)
  - Default model selection for improvements
  - Configuration persists across sessions

- **FR-012**: System MUST fail gracefully in all error scenarios:
  - API failures: pass through original prompt unchanged
  - Timeouts: pass through original prompt unchanged
  - Invalid responses: pass through original prompt unchanged
  - Plugin crashes: Claude Code architecture handles gracefully

- **FR-013**: System MUST detect and integrate with claude-memory-plugin when available:
  - Check for plugin presence
  - Read `index.json` for memory index
  - Match memories by title/tag keywords to prompt content
  - Limit to top 3-5 most relevant memories
  - Degrade gracefully if memory plugin not installed

- **FR-014**: System MUST prioritise LSP diagnostics intelligently:
  - Include diagnostics only for prompts related to debugging/fixing
  - Prioritise errors over warnings
  - Limit to maximum 5 most relevant diagnostics
  - Include file path, line number, and error message

- **FR-015**: System MUST parse specification files intelligently:
  - Check for `.specify/` directory presence
  - Parse frontmatter for task status
  - Extract relevant user stories based on prompt keywords
  - Include acceptance criteria for implementation-related prompts
  - Skip specification integration if directory doesn't exist

- **FR-016**: System MUST conform to API contracts defined in `contracts/` directory:
  - `hook-interface.yaml`: Hook stdin/stdout schema for UserPromptSubmit
  - `classification-api.yaml`: Classification request/response schema
  - `improvement-api.yaml`: Improvement request/response schema
  - All interfaces validated against OpenAPI 3.0 specification

### Key Entities

- **Prompt**: The user's input text submitted to Claude
  - Attributes: original text, token count, classification level (NONE/SIMPLE/COMPLEX), bypass reason (if applicable)
  - Relationships: transformed into ImprovedPrompt via improvement pipeline

- **ImprovedPrompt**: The enhanced version of user's prompt
  - Attributes: enhanced text, applied tags (XML structure), injected context sources, model used (Haiku/Sonnet), improvement latency
  - Relationships: derived from original Prompt, sent to Claude session

- **Context**: Information gathered from various sources to enrich prompts
  - Attributes: source type (git/LSP/spec/memory/session), relevance score, content snippet
  - Relationships: multiple Context items injected into ImprovedPrompt

- **Classification**: The assessment of improvement potential
  - Attributes: level (NONE/SIMPLE/COMPLEX), confidence score, reasoning, model used (Haiku)
  - Relationships: determines improvement strategy for Prompt

- **Configuration**: User-defined settings for plugin behaviour
  - Attributes: enabled flag, token threshold, integration toggles, default model
  - Relationships: controls bypass logic and context gathering behaviour

- **LogEntry**: Record of prompt processing for transparency
  - Attributes: timestamp, original prompt, improved prompt, classification, model, latency, bypass reason
  - Relationships: one LogEntry per processed Prompt

- **BypassDecision**: Record of why a prompt was bypassed without improvement
  - Attributes: reason (short_prompt/explicit_skip/low_context/forked_session/plugin_disabled/classification_failed/improvement_failed), detection latency
  - Relationships: one BypassDecision per bypassed Prompt, alternative to ImprovedPrompt

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive improved prompts for 60%+ of their submissions (40% or fewer are bypassed or classified as NONE), indicating the plugin adds value to majority of interactions.

- **SC-002**: Prompt classification completes in under 5 seconds for 95% of prompts, ensuring minimal latency impact on user workflow.

- **SC-003**: Total improvement latency (classification + context gathering + improvement) stays under 30 seconds for SIMPLE prompts and under 60 seconds for COMPLEX prompts in 90% of cases.

- **SC-004**: Zero user prompts are blocked or fail to process due to plugin errors (100% passthrough fallback on any failure condition).

- **SC-005**: Plugin operates successfully in projects without git repositories, without specifications, without LSP configured, and without memory plugin (graceful degradation for all optional integrations).

- **SC-006**: Bypass detection completes in under 100ms for 100% of prompts meeting bypass conditions (short prompts, `#skip` tag, low context, forked session).

- **SC-007**: Test coverage reaches 100% for all production code with 1:1 test file parity (every .ts has corresponding .spec.ts), demonstrating TDD compliance.

- **SC-008**: Improved prompts preserve user's original intent in 95%+ of cases as validated by user acceptance testing or review.

- **SC-009**: Plugin successfully detects and integrates with claude-memory-plugin when installed, and operates without errors when not installed (tested in both scenarios).

- **SC-010**: Documentation (README.md) enables a new user to install and configure the plugin without external assistance in under 10 minutes.

- **SC-011**: All technical decisions (classification prompt design, session forking approach, token counting heuristic) are documented with rationale and validation results before implementation begins.

## Assumptions *(mandatory)*

- **A-001**: Users have Claude Code installed and configured with API access to Claude models (Haiku and Sonnet).

- **A-002**: The `claude` CLI command is available in the system PATH and supports `--fork-session` and `--print` flags.

- **A-003**: Users accept that prompt improvement adds latency (5-60 seconds) in exchange for better response quality.

- **A-004**: A TypeScript-compatible runtime (e.g., Bun, Deno, ts-node) is installed and available for executing the plugin's TypeScript code.

- **A-005**: The plugin has read access to the working directory for git operations, specification files, and memory index.

- **A-006**: Context gathering from git, LSP, and specifications provides meaningful signal (i.e., these sources contain relevant information when available).

- **A-007**: Claude models (Haiku/Sonnet) are capable of accurately classifying prompts and improving them without introducing errors or misinterpreting user intent.

- **A-008**: The GaZmagik/enhance marketplace supports the Claude Code plugin architecture and users can install plugins from it.

- **A-009**: Session forking via `claude --fork-session` creates isolated contexts that don't affect the main conversation history.

- **A-010**: Users running the plugin in non-git directories, without specifications, or without LSP still find value in the core improvement functionality alone.

## Out of Scope *(mandatory)*

- **OOS-001**: Manual hashtag triggers for model selection (e.g., `#haiku`, `#sonnet`) - automatic classification only.

- **OOS-002**: Aggregate statistics tracking across multiple sessions (e.g., "total improvements this week") - only per-prompt latency logging.

- **OOS-003**: User feedback mechanisms to rate improvement quality - no interactive approval/rejection workflow.

- **OOS-004**: Integration with Ollama or other local LLM providers - Claude models only via Claude Code CLI.

- **OOS-005**: Custom improvement prompt templates - plugin uses built-in improvement strategies.

- **OOS-006**: Multi-language prompt translation or internationalisation of plugin messages - English only for plugin metadata.

- **OOS-007**: Prompt caching or deduplication - each prompt processed independently regardless of similarity to previous prompts.

- **OOS-008**: Integration with external knowledge bases beyond memory plugin - only sources within Claude Code ecosystem.

- **OOS-009**: Batch processing of multiple prompts - single prompt processing per hook invocation.

- **OOS-010**: Historical analytics or dashboards showing improvement patterns over time - logging only, no analytics UI.

## Dependencies *(mandatory)*

- **DEP-001**: Claude Code CLI (`claude` command) with support for `--fork-session`, `--print`, and model selection flags.

- **DEP-002**: TypeScript-compatible runtime environment with support for native TypeScript execution and modern ES modules.

- **DEP-003**: Claude API access with permissions to call Haiku and Sonnet models via Claude Code CLI.

- **DEP-004**: Optional: Git installed and accessible via command line for git context gathering integration.

- **DEP-005**: Optional: LSP servers configured and running for diagnostics integration (language-specific, e.g., typescript-language-server).

- **DEP-006**: Optional: claude-memory-plugin installed for memory integration feature.

- **DEP-007**: File system access to working directory for reading specifications, git state, and writing logs.

- **DEP-008**: Network connectivity for Claude API calls during classification and improvement (via Claude Code CLI).

## Open Questions *(mandatory)*

- **OQ-001**: What is the optimal token threshold for short prompt detection? Default is 10, but should this be user-configurable or adaptive based on user patterns?

- **OQ-002**: How should the plugin handle prompts that are improved but result in a longer prompt that approaches context limits? Should there be a maximum improved prompt length?

- **OQ-003**: Should the plugin support a "dry run" mode where improvements are shown but not automatically applied, requiring user confirmation?

- **OQ-004**: What is the best strategy for matching specification content to prompt keywords? Simple string matching, semantic similarity, or LLM-based relevance scoring?

- **OQ-005**: Should bypass reasons be surfaced to the user in the UI, or only logged for debugging purposes?

- **OQ-006**: How should the plugin prioritise multiple context sources when context budget is limited? Is there a hierarchy (e.g., LSP diagnostics > git > specs > memory)?

- **OQ-007**: Should configuration support per-project overrides (e.g., `.claude-prompt-improver.json` in project root) or only global settings?

- **OQ-008**: What logging rotation or retention policy should be implemented for `.claude/logs/prompt-improver-latest.log` to prevent unbounded growth?

---

**Feature**: 001 | **Status**: Draft | **Created**: 2026-01-18

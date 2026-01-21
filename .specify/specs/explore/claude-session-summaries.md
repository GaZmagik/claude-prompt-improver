# Exploration: Claude Session Summaries

**Created**: 2026-01-21
**Explorer**: Claude Sonnet 4.5
**Status**: Ready for Specification

---

## Feature Intent

The user wants to build a Claude Code plugin that captures session content before it gets compacted and provides a way to retrieve session summaries segmented by session boundaries. Currently, when Claude Code compacts conversations to manage context window size, the detailed history is lost. This plugin aims to preserve that history by:

1. Hooking into PreCompact events to extract session content (thinking, text, tool calls) before compaction occurs
2. Storing extracted content in a structured format that respects session boundaries
3. Providing a skill/command to retrieve summaries segmented by session ID

The core problem is that Claude Code's transcript files are overwritten/truncated during compaction, so without proactive extraction, historical context is permanently lost. This plugin solves that by creating incremental backups triggered by compaction events.

## Suggested Specify Prompt

Use this as the argument for `/speckit:specify`:

```
Create a Claude Code plugin called "claude-session-summaries" that captures and retrieves session transcripts before compaction.

**Core Requirements:**

1. PreCompact Hook Implementation
   - Trigger on PreCompact events (both auto and manual)
   - Extract assistant content from session transcript: thinking blocks, text responses, and tool calls
   - Handle the transcript_path bug (issue #13668) where transcript_path may be empty - implement fallback using glob search for session_id.jsonl files
   - Store extracted content incrementally with checkpoint tracking to handle multiple compactions per session

2. Storage Strategy
   - Target directory: .claude/summaries/
   - Use append-only log format: {session_id}.log for incremental extraction from PreCompact
   - Accept that duplicate extractions are tolerable (idempotent approach)
   - Store session boundaries and compaction markers for later segmentation

3. Retrieval Command/Skill
   - Provide a command to retrieve session summaries by session ID
   - Segment output by session boundaries (marked by file-history-snapshot with isSnapshotUpdate: false)
   - Support filtering by content type (thinking/text/tool_use)
   - Include metadata: timestamps, session segments, compaction points

4. Transcript Parsing
   - Parse JSONL format from ~/.claude/projects/{slug}/{session_id}.jsonl
   - Handle session boundaries: file-history-snapshot events with isSnapshotUpdate: false indicate session start
   - Handle compaction markers: system messages with subtype: "compact_boundary"
   - Extract assistant message content array with types: thinking, text, tool_use
   - Gracefully handle corrupted lines, missing markers, and empty sessions

5. Edge Cases
   - Empty sessions with no assistant messages
   - Very large transcripts (100K+ lines)
   - Concurrent PreCompact events
   - Sessions accessed without prior compaction
   - Missing or malformed transcript files

**Success Criteria:**
- PreCompact hook successfully extracts content before compaction
- Retrieved summaries accurately reflect session structure with clear segment boundaries
- Fallback mechanism works when transcript_path is empty
- Plugin handles incremental updates without data loss
- Performance remains acceptable for large transcripts
```

## Suggested Plan Prompt

Use this as the argument for `/speckit:plan`:

```
Implement as a standalone Claude Code plugin using TypeScript with Bun runtime.

**Architectural Approach:**

1. Hybrid Strategy
   - PreCompact hook: Simple append-only log extraction (avoid complex state management)
   - Retrieval command: Full parse with intelligent segment detection
   - Rationale: Avoid race conditions, accept tolerable duplicates, prioritise simplicity

2. Technology Stack
   - Runtime: Bun (for performance and native TypeScript support)
   - Parsing: Simple line-by-line JSONL reading (avoid heavy streaming libraries for this use case)
   - File operations: Native fs module with atomic append operations
   - Pattern: Follow existing hooks in ~/.claude/hooks/ts/ for consistency

3. Library-First Design
   - Reuse patterns from existing hooks: runHook() wrapper, error-handler.ts, types.ts
   - Use forked-session.ts pattern if background processing needed
   - Avoid creating new abstractions - use Node.js/Bun built-ins directly

4. Bug Workaround Strategy
   - Primary: Use transcript_path from hook input when available
   - Fallback: Glob search ~/.claude/projects/**/{session_id}.jsonl when transcript_path is empty
   - Defensive: Validate file exists before reading

5. File Structure
   ```
   claude-session-summaries/
   ├── hooks/
   │   └── pre-compact.ts          # PreCompact hook implementation
   ├── skills/
   │   └── retrieve-summary.sh     # Command interface
   ├── lib/
   │   ├── transcript-parser.ts    # JSONL parsing logic
   │   ├── session-extractor.ts    # Content extraction
   │   ├── segment-detector.ts     # Session boundary detection
   │   └── storage.ts              # Append-only log operations
   ├── types.ts                    # Type definitions
   └── package.json
   ```

6. Key Considerations
   - Performance: Read transcripts incrementally, not all at once in PreCompact hook
   - Concurrency: Use append-only logs to avoid file locking issues
   - Storage: Plain text format for easy debugging and manual inspection
   - Error Handling: Fail gracefully on parsing errors, log to hook logs
   - Testing: Test with empty sessions, large transcripts, concurrent events

7. Anti-Patterns to Avoid
   - Don't create wrapper abstractions around fs operations
   - Don't use complex streaming libraries for simple JSONL parsing
   - Don't implement file locking (accept duplicates instead)
   - Don't try to prevent all race conditions (design for tolerance)
   - Don't create a meta file with state (use append-only log)

8. Follow Existing Patterns
   - Use runHook() from error-handler.ts for consistent hook behaviour
   - Use EXIT_ALLOW/EXIT_BLOCK constants
   - Log to ~/.claude/logs/ or project .claude/logs/
   - Handle forked sessions appropriately (skip processing)
```

## Research Notes

### Architectural Approach

**Recommended**: Hybrid Strategy with Append-Only Log

**Rationale**:
- PreCompact events may fire rapidly, creating race conditions with stateful meta files
- Append-only logs are atomic and naturally handle concurrent writes
- Duplicates in extraction are acceptable (content is idempotent)
- Simpler than managing checkpoint state with file locking
- Retrieval command can intelligently deduplicate and segment during read

**Alternatives Considered**:
- **Meta File with Checkpoint**: Track `lastLineExtracted` in `.meta.json` file, increment on each PreCompact
  - Pros: Efficient, avoids duplicate extraction
  - Cons: Race conditions on concurrent PreCompact, complex state management, single point of failure
- **Streaming Parser**: Use libraries like stream-json or @streamparser/json for line-by-line processing
  - Pros: Memory efficient for very large files
  - Cons: Added dependency, overkill for typical transcript sizes, complexity doesn't match benefit
- **Session-Aware Segments**: Create one file per session boundary during PreCompact
  - Pros: Natural segmentation, no post-processing needed
  - Cons: Requires parsing session boundaries in PreCompact hook (slower), more files to manage

### Technology Evaluation

**Recommended Libraries/Frameworks**:
- **Runtime**: Bun - Fast, native TypeScript, Node.js compatible
- **Parsing**: Native `fs.readFileSync()` with `split('\n')` - Simple, adequate for JSONL
- **Hook Framework**: Reuse `runHook()` pattern from existing hooks
- **Storage**: Native `fs.appendFileSync()` - Atomic, simple, reliable

**Alternatives**:
- **@streamparser/json**: Full streaming parser with SAX-like events
  - Why not chosen: Overkill for line-based JSONL, adds unnecessary dependency
- **stream-json**: Node.js streams for JSON processing
  - Why not chosen: Complexity doesn't match use case, typical transcripts fit in memory
- **Separate HOME directory**: Like forked-session.ts uses for memory captures
  - Why not chosen: Not needed for this use case, extraction is fast enough to run inline

### Key Considerations

**Performance**:
- Typical transcript: 1K-10K lines (~1-10MB) - fits in memory easily
- Large transcript: 100K+ lines (~100MB+) - still manageable with line-by-line processing
- PreCompact hook timeout: 60 seconds default - sufficient for extraction
- Strategy: Read only new lines since last checkpoint (tracked in append-only log)

**Concurrency**:
- PreCompact may fire multiple times in quick succession during heavy compaction periods
- Append-only logs naturally handle concurrent writes (OS-level atomic append)
- Accept that some content may be extracted multiple times (idempotent operation)
- Retrieval command deduplicates during read phase

**Bug Workaround (Issue #13668)**:
- Problem: `transcript_path` field in PreCompact hook is empty string
- Workaround: Use `session_id` to glob search `~/.claude/projects/**/{session_id}.jsonl`
- Fallback chain:
  1. Use `transcript_path` if non-empty
  2. Glob search by `session_id`
  3. Error gracefully if not found
- Limitation: Requires filesystem access, but PreCompact hooks already have that

**Storage Format**:
```
.claude/summaries/
├── {session_id}.log           # Append-only extraction log
└── README.md                  # Documentation
```

Each log entry format:
```
[TIMESTAMP] [SEGMENT:N] [TYPE:thinking|text|tool_use]
<content>
---
```

### Open Questions

1. **Should we compress old logs?** - Probably not in v1, add if storage becomes issue
2. **Should we support export formats (JSON/Markdown)?** - Defer to v2, focus on core functionality
3. **How to handle session resumption?** - Each resumed session gets same session_id, log continues appending
4. **Should we provide a cleanup command?** - Yes, add to backlog for v1.1
5. **What about pre-compaction sessions?** - Retrieval command should work even without any PreCompact extractions by reading transcript directly

### Risks

1. **transcript_path bug persists**: Workaround depends on filesystem structure not changing
   - Mitigation: Document dependency, add tests for path resolution
2. **Very large transcripts cause timeout**: Extraction takes >60 seconds
   - Mitigation: Process incrementally, add timeout handling, potentially use forked session for heavy processing
3. **Storage growth**: Logs accumulate over time without cleanup
   - Mitigation: Document storage location, provide cleanup guidance, consider TTL in future
4. **Duplicate content**: Same content extracted multiple times
   - Mitigation: Document as acceptable trade-off, retrieval deduplicates
5. **Session boundary detection fails**: Missing or malformed markers
   - Mitigation: Fallback to compaction markers, graceful degradation

---

## Next Steps

1. Review the suggested prompts above
2. Adjust if needed based on project-specific context
3. Run `/speckit:specify` with the suggested specify prompt
4. Run `/speckit:plan` with the suggested plan prompt
5. Retrieve research notes from memory: `memory search "session summary"`

## Sources

Research conducted using:
- [GitHub Issue #13668: PreCompact hook empty transcript_path bug](https://github.com/anthropics/claude-code/issues/13668)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)
- [GitHub: claude-code-transcripts by simonw](https://github.com/simonw/claude-code-transcripts)
- [npm: stream-json](https://www.npmjs.com/package/stream-json)
- [npm: @streamparser/json](https://www.npmjs.com/package/@streamparser/json)
- [GitHub: sapientpro/json-stream](https://github.com/sapientpro/json-stream)
- [Wikipedia: JSON streaming](https://en.wikipedia.org/wiki/JSON_streaming)

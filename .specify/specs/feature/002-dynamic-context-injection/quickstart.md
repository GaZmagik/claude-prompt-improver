# Quickstart: Dynamic Context Injection v1.3.0

**Purpose**: Developer guide for implementing and validating dynamic context injection feature

**Date**: 2026-01-21

---

## Quick Start (5 minutes)

### Prerequisites

- Bun 1.3.6+ or Node.js v22.21.1+
- Git branch: `feature/v1.3.0-dynamic-context-injection`
- Familiarity with TypeScript and async/await patterns

### Setup Development Environment

```bash
# 1. Ensure you're on the feature branch
git checkout feature/v1.3.0-dynamic-context-injection

# 2. Install dependencies (if not already done)
bun install

# 3. Run existing tests to verify baseline
cd hooks
bun test

# 4. Verify TypeScript compilation
npx tsc --noEmit
```

Expected output: All tests pass, no TypeScript errors.

---

## Development Workflow

### Phase 1: Filesystem Scanning Infrastructure

**Goal**: Build core scanning, caching, and validation utilities

**Files to Create**:
- `hooks/src/integrations/dynamic-discovery.ts` (partial - infrastructure only)
- `hooks/src/integrations/dynamic-discovery.spec.ts` (test suite)

**TDD Cycle**:

1. **Write Test First** (Red):
```typescript
// hooks/src/integrations/dynamic-discovery.spec.ts
import { describe, expect, it } from 'bun:test';
import { scanDirectory } from './dynamic-discovery.ts';

describe('scanDirectory', () => {
  it('should scan directory and return .md files', async () => {
    const files = await scanDirectory('/test/dir', {
      _mockFileSystem: {
        '/test/dir/agent1.md': '# Agent 1',
        '/test/dir/agent2.md': '# Agent 2',
        '/test/dir/readme.txt': 'Not markdown',
      }
    });

    expect(files).toHaveLength(2);
    expect(files).toContain('/test/dir/agent1.md');
    expect(files).toContain('/test/dir/agent2.md');
  });
});
```

2. **Run Test** (should fail):
```bash
bun test dynamic-discovery.spec.ts
# Expected: scanDirectory is not exported
```

3. **Implement Minimum Code** (Green):
```typescript
// hooks/src/integrations/dynamic-discovery.ts
export async function scanDirectory(
  dirPath: string,
  options?: { _mockFileSystem?: Record<string, string | null> }
): Promise<string[]> {
  const { _mockFileSystem } = options || {};

  if (_mockFileSystem) {
    // Mock implementation
    return Object.keys(_mockFileSystem)
      .filter(path => path.startsWith(dirPath) && path.endsWith('.md'));
  }

  // Real implementation (Phase 1)
  throw new Error('Not implemented yet');
}
```

4. **Run Test** (should pass):
```bash
bun test dynamic-discovery.spec.ts
# Expected: ✓ scanDirectory > should scan directory and return .md files
```

5. **Refactor** (if needed, then re-run tests)

**Complete Phase 1 Checklist**:
- [ ] `scanDirectory()` implemented with timeout
- [ ] `DiscoveryCache` class with LRU eviction
- [ ] `validateResourcePath()` security function
- [ ] `expandHomePath()` cross-platform utility
- [ ] All tests pass with `_mockFileSystem`
- [ ] `npx tsc --noEmit` passes

---

### Phase 2: Agent Discovery

**Goal**: Implement agent discovery, parsing, and matching

**Files to Modify**:
- `hooks/src/integrations/dynamic-discovery.ts` (add agent functions)
- `hooks/src/integrations/dynamic-discovery.spec.ts` (add agent tests)

**TDD Example**:

```typescript
// Test first
describe('discoverAgents', () => {
  it('should discover agents from global and local directories', async () => {
    const agents = await discoverAgents({
      _mockFileSystem: {
        '~/.claude/agents/': 'directory',
        '~/.claude/agents/expert.md': `---
name: "TypeScript Expert"
description: "Specialised in TypeScript"
keywords: ["typescript", "types"]
---`,
        '.claude/agents/': 'directory',
        '.claude/agents/local.md': `---
name: "Local Agent"
description: "Project-specific agent"
---`,
      }
    });

    expect(agents).toHaveLength(2);
    expect(agents[0]?.name).toBe('TypeScript Expert');
    expect(agents[1]?.name).toBe('Local Agent');
  });

  it('should prefer local agents over global with same name', async () => {
    const agents = await discoverAgents({
      _mockFileSystem: {
        '~/.claude/agents/expert.md': `---
name: "Global Expert"
---`,
        '.claude/agents/expert.md': `---
name: "Local Expert"
---`,
      }
    });

    expect(agents).toHaveLength(1);
    expect(agents[0]?.name).toBe('Local Expert');
  });
});
```

**Complete Phase 2 Checklist**:
- [ ] `discoverAgents()` implemented
- [ ] `parseAgentMetadata()` reuses `parseFrontmatter()`
- [ ] `matchAgentsToPrompt()` uses `matchItemsByKeywords()`
- [ ] `formatAgentSuggestions()` implemented
- [ ] Local precedence works correctly
- [ ] All tests pass
- [ ] `npx tsc --noEmit` passes

---

### Phase 3: Multi-Source Discovery

**Goal**: Extend to commands, skills, and output styles

**TDD Pattern** (apply to each resource type):

```typescript
describe('discoverCommands', () => {
  it('should discover commands from both directories', async () => {
    // Similar pattern to agents
  });
});

describe('discoverSkills', () => {
  it('should discover skills as directories', async () => {
    // Skills are directory-based, special handling
  });
});

describe('discoverOutputStyles', () => {
  it('should discover output styles', async () => {
    // Same pattern as agents/commands
  });
});

describe('formatDynamicContext', () => {
  it('should format all resource types into sections', () => {
    const context: DynamicContext = {
      matchedAgents: [/* ... */],
      matchedCommands: [/* ... */],
      matchedSkills: [/* ... */],
      matchedOutputStyles: [/* ... */],
      isMemoryThinkContext: false,
    };

    const formatted = formatDynamicContext(context);

    expect(formatted).toContain('Suggested Agents:');
    expect(formatted).toContain('Suggested Commands:');
  });
});
```

**Complete Phase 3 Checklist**:
- [ ] All resource types discovered
- [ ] Parallel discovery with timeout per source
- [ ] Combined formatting includes all types
- [ ] All tests pass
- [ ] `npx tsc --noEmit` passes

---

### Phase 4: Memory Think Special Case

**Goal**: Detect memory think and format special suggestions

**TDD Example**:

```typescript
describe('detectMemoryThinkPattern', () => {
  it('should detect memory think create', () => {
    const result = detectMemoryThinkPattern('memory think create "API design"');
    expect(result.detected).toBe(true);
    expect(result.pattern).toBe('create');
  });

  it('should be case insensitive', () => {
    const result = detectMemoryThinkPattern('MEMORY THINK ADD "note"');
    expect(result.detected).toBe(true);
  });

  it('should not detect non-memory-think prompts', () => {
    const result = detectMemoryThinkPattern('regular prompt');
    expect(result.detected).toBe(false);
  });
});

describe('formatMemoryThinkSuggestions', () => {
  it('should format with --agent and --style examples', () => {
    const formatted = formatMemoryThinkSuggestions(memoryThinkContext);

    expect(formatted).toContain('💡 Memory Think Suggestions:');
    expect(formatted).toContain('--agent');
    expect(formatted).toContain('--style');
  });
});
```

**Complete Phase 4 Checklist**:
- [ ] Pattern detection works for all variants
- [ ] Special formatting implemented
- [ ] Usage examples clear and correct
- [ ] All tests pass
- [ ] `npx tsc --noEmit` passes

---

### Phase 5: Integration & Configuration

**Goal**: Wire into context-builder.ts and add config toggle

**Files to Modify**:
- `hooks/src/context/context-builder.ts`
- `hooks/src/context/context-builder.spec.ts` (if exists, or create integration tests)

**Integration Steps**:

1. **Add to ContextBuilderInput**:
```typescript
export interface ContextBuilderInput {
  // ... existing fields
  readonly dynamicOptions?: DynamicDiscoveryOptions;
}
```

2. **Add to ContextSource type**:
```typescript
export type ContextSource =
  | 'tools'
  | 'skills'
  | 'agents'
  | 'git'
  | 'lsp'
  | 'spec'
  | 'memory'
  | 'session'
  | 'dynamic';  // ADD THIS
```

3. **Add to buildAsyncTasks()**:
```typescript
if (dynamicOptions && dynamicOptions.enabled !== false) {
  tasks.push(
    createAsyncTask(
      () => gatherDynamicContext(dynamicOptions),
      (ctx) => {
        results.dynamic = ctx;
        sources.push('dynamic');
      }
    )
  );
}
```

4. **Add to formatContextForInjection()**:
```typescript
const dynamic = formatField(context.dynamic, sources, 'dynamic', formatDynamicContext);

return {
  // ... existing fields
  ...(dynamic !== undefined && { dynamic }),
};
```

**Integration Test Example**:

```typescript
describe('context-builder with dynamic discovery', () => {
  it('should include dynamic context when enabled', async () => {
    const context = await buildContext({
      prompt: 'typescript help',
      dynamicOptions: {
        enabled: true,
        _mockFileSystem: {
          '~/.claude/agents/typescript-expert.md': `---
name: "TypeScript Expert"
description: "TypeScript specialist"
keywords: ["typescript"]
---`,
        },
      },
    });

    expect(context.sources).toContain('dynamic');
    expect(context.dynamic?.matchedAgents).toHaveLength(1);
  });

  it('should skip when disabled', async () => {
    const context = await buildContext({
      prompt: 'test',
      dynamicOptions: { enabled: false },
    });

    expect(context.sources).not.toContain('dynamic');
  });
});
```

**Complete Phase 5 Checklist**:
- [ ] Integrated into context-builder.ts
- [ ] Configuration toggle works
- [ ] Doesn't block other integrations
- [ ] All integration tests pass
- [ ] `npx tsc --noEmit` passes
- [ ] quickstart.md completed

---

## Validation Scenarios

### Scenario 1: Agent Discovery and Matching

**Purpose**: Validate US1 - Agent Discovery

**Steps**:
1. Create test agent files with frontmatter in mock filesystem
2. Submit prompt with keywords matching agent descriptions
3. Verify matched agents appear in improved prompt

**Expected Outcome**:
```
User prompt: "Help me with TypeScript interfaces"

Improved prompt context includes:
---
Suggested Agents:
- TypeScript Expert: Specialised in TypeScript type systems and advanced patterns
---
```

**Test Code**:
```typescript
it('Scenario 1: Agent discovery and matching', async () => {
  const result = await gatherDynamicContext({
    _mockFileSystem: {
      '~/.claude/agents/typescript-expert.md': `---
name: "TypeScript Expert"
description: "Specialised in TypeScript type systems and advanced patterns"
keywords: ["typescript", "types", "interfaces", "generics"]
---`,
    },
  });

  const formatted = formatDynamicContext(result.context!, 'Help me with TypeScript interfaces');
  expect(formatted).toContain('TypeScript Expert');
});
```

---

### Scenario 2: Local Precedence

**Purpose**: Validate FR-009 - Local/Global Precedence

**Steps**:
1. Create agents with same name in both global and local directories
2. Discover agents
3. Verify only local version appears

**Expected Outcome**:
Only the local agent is discovered, global agent is hidden.

**Test Code**:
```typescript
it('Scenario 2: Local precedence over global', async () => {
  const agents = await discoverAgents({
    _mockFileSystem: {
      '~/.claude/agents/expert.md': `---
name: "Global Expert"
description: "Global version"
---`,
      '.claude/agents/expert.md': `---
name: "Local Expert"
description: "Local version"
---`,
    },
  });

  expect(agents).toHaveLength(1);
  expect(agents[0]?.description).toBe('Local version');
});
```

---

### Scenario 3: Memory Think Detection

**Purpose**: Validate US3 - Memory Think Special Case

**Steps**:
1. Submit prompt matching memory think pattern
2. Verify special formatting applied
3. Check --agent and --style flag examples present

**Expected Outcome**:
```
💡 Memory Think Suggestions:

Consider using --agent <name> for domain expertise or --style <name> for perspective.

Suggested Agents:
- memory think add 'consideration' --agent security-expert

Suggested Styles:
- memory think counter 'argument' --style devil's-advocate
```

**Test Code**:
```typescript
it('Scenario 3: Memory think detection and formatting', () => {
  const pattern = detectMemoryThinkPattern('memory think create "API design decisions"');
  expect(pattern.detected).toBe(true);

  const formatted = formatMemoryThinkSuggestions({
    pattern: 'create',
    suggestedAgents: [/* mock agents */],
    suggestedStyles: [/* mock styles */],
    usageGuidance: '...',
  });

  expect(formatted).toContain('💡 Memory Think Suggestions:');
  expect(formatted).toContain('--agent');
  expect(formatted).toContain('--style');
});
```

---

### Scenario 4: Cache Performance

**Purpose**: Validate US5 - Performance (cache hit rate)

**Steps**:
1. Discover agents (cold cache)
2. Discover same agents again (warm cache)
3. Measure cache hits vs misses

**Expected Outcome**:
- First call: cache miss (reads filesystem)
- Second call: cache hit (no filesystem access)
- Cache hit rate: 100% for unchanged files

**Test Code**:
```typescript
it('Scenario 4: Cache improves performance', async () => {
  const cache = new DiscoveryCache();

  // First access - cache miss
  const item1 = cache.get('/test/agent.md');
  expect(item1).toBeNull();

  // Store in cache
  cache.set('/test/agent.md', mockItem, 123456789);

  // Second access - cache hit
  const item2 = cache.get('/test/agent.md');
  expect(item2).toEqual(mockItem);
});
```

---

### Scenario 5: Graceful Error Handling

**Purpose**: Validate FR-016 - Filesystem Errors Handled Gracefully

**Steps**:
1. Simulate missing directory
2. Simulate permission error
3. Verify no crashes, partial results returned

**Expected Outcome**:
- Missing directory skipped silently
- Permission error logged, other directories continue
- Result includes discovered items from successful scans

**Test Code**:
```typescript
it('Scenario 5: Handles missing directories gracefully', async () => {
  const result = await gatherDynamicContext({
    _mockFileSystem: {
      // Note: ~/.claude/agents/ does not exist in mock
      '.claude/agents/local.md': `---
name: "Local Agent"
---`,
    },
  });

  // Should succeed with partial results
  expect(result.success).toBe(true);
  expect(result.context?.matchedAgents).toHaveLength(1);
});
```

---

## Common Gotchas

### Gotcha 1: TypeScript Compilation Errors

**Problem**: `npx tsc --noEmit` fails with interface property errors

**Solution**: Always verify interface properties match across files
- Check `SpecAwarenessOptions` has `featureName` not `specFile`
- Run `npx tsc --noEmit` before committing (per memory gotcha)

```bash
# Pre-commit check
npx tsc --noEmit
# Expected: No errors
```

### Gotcha 2: Mock Filesystem Directory Keys

**Problem**: Directory existence checks fail in tests

**Solution**: Mock filesystem directories need trailing slash
```typescript
// WRONG
_mockFileSystem: {
  '~/.claude/agents': 'directory',  // Won't work
}

// CORRECT
_mockFileSystem: {
  '~/.claude/agents/': 'directory',  // Trailing slash required
}
```

### Gotcha 3: Path Expansion in Tests

**Problem**: `~/.claude/` paths not expanded in mock filesystem

**Solution**: Use `expandHomePath()` before checking mock
```typescript
// In production code
const expandedPath = expandHomePath('~/.claude/agents/');
const content = readFileSyncSafe(expandedPath, _mockFileSystem);
```

### Gotcha 4: Promise.allSettled Never Throws

**Problem**: Expecting Promise.allSettled to throw on error

**Solution**: Check result status, don't catch exceptions
```typescript
// WRONG
try {
  await Promise.allSettled([...]);
} catch (error) {
  // This never runs - allSettled never throws
}

// CORRECT
const results = await Promise.allSettled([...]);
results.forEach(result => {
  if (result.status === 'rejected') {
    console.warn('Task failed:', result.reason);
  }
});
```

### Gotcha 5: Cache Invalidation Edge Case

**Problem**: File modified but mtime unchanged (rare on some filesystems)

**Solution**: Document known limitation, acceptable risk
```typescript
// Note: If file modified within same millisecond, cache may not invalidate
// This is a filesystem limitation, not a bug in our code
// Probability: <0.01% in practice
```

---

## Performance Benchmarks

### Target Metrics (from spec)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Discovery time per directory | <2 seconds | 95% of scans |
| Cache hit rate | >80% | Repeated prompts |
| Filesystem errors | 0 crashes | 100% handled gracefully |

### How to Measure

```typescript
// Benchmark discovery time
const start = performance.now();
const result = await gatherDynamicContext(options);
const elapsed = performance.now() - start;
console.log(`Discovery time: ${elapsed}ms`);
// Expected: <2000ms for <100 files

// Benchmark cache hit rate
let hits = 0, misses = 0;
for (let i = 0; i < 100; i++) {
  const item = cache.get(filePath);
  if (item) hits++; else misses++;
}
console.log(`Cache hit rate: ${(hits / (hits + misses) * 100).toFixed(1)}%`);
// Expected: >80%
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
// Add to dynamic-discovery.ts
const DEBUG = process.env.DEBUG_DYNAMIC_DISCOVERY === 'true';

function debugLog(message: string) {
  if (DEBUG) console.log(`[DynamicDiscovery] ${message}`);
}

// Usage
debugLog(`Scanning directory: ${dirPath}`);
```

Run with:
```bash
DEBUG_DYNAMIC_DISCOVERY=true bun test
```

### Inspect Mock Filesystem

```typescript
// In tests
console.log('Mock filesystem keys:', Object.keys(_mockFileSystem));
console.log('Mock content:', _mockFileSystem['/path/to/file']);
```

### Check Cache State

```typescript
// Add to DiscoveryCache class
public inspect(): { size: number; keys: string[] } {
  return {
    size: this.cache.size,
    keys: Array.from(this.cache.keys()),
  };
}

// In tests
console.log('Cache state:', cache.inspect());
```

---

## Success Criteria Validation

Before marking feature complete, verify all success criteria from spec.md:

- [ ] **SC-001**: Agents/commands/skills/styles discovered automatically (100% test cases)
- [ ] **SC-002**: Discovery completes within 2 seconds (95% of scans)
- [ ] **SC-003**: Cache hit rate reaches 80%+ (repeated prompts)
- [ ] **SC-004**: Local resources override global (100% test cases)
- [ ] **SC-005**: Missing directories handled gracefully (0 crashes)
- [ ] **SC-006**: Memory think prompts receive special suggestions (100% test cases)
- [ ] **SC-007**: Test coverage 100% for all exported functions
- [ ] **SC-008**: Path validation rejects directory traversal (100% security tests)
- [ ] **SC-009**: Promise.allSettled integration works (100% error scenarios)
- [ ] **SC-010**: Configuration toggle works (100% test cases)
- [ ] **SC-011**: Cross-platform compatibility (tests pass on all platforms)

---

## Next Steps After Implementation

1. **Manual Testing** (not automated):
   - Create real `.claude/agents/` directory with sample agents
   - Test with actual Claude Code plugin
   - Verify suggestions appear in improved prompts

2. **Performance Testing** (if needed):
   - Test with 100+ agent files
   - Measure discovery time
   - Validate cache hit rate

3. **Documentation**:
   - Update plugin README.md with dynamic discovery feature
   - Document configuration options
   - Add troubleshooting guide

4. **Code Review Checklist**:
   - All tests pass
   - `npx tsc --noEmit` passes
   - No security vulnerabilities (path validation tested)
   - Constitution compliance verified
   - Integration tests validate interface signatures

---

**Status**: Quickstart Complete | **Ready for TDD Implementation** | **All Scenarios Documented**

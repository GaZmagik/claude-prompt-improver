# Exploration: Wire Context Sources (Tools, Skills, Agents)

## Feature Intent

The prompt improvement pipeline gathers context from multiple sources to enrich prompts before sending to Claude. Two sources work correctly (git, memory), but three are broken:

- **Tools**: Claude Code sends `available_tools` in stdin, but the hook never extracts or passes it
- **Skills**: No skill rules source configured; skill-matcher.ts never receives data
- **Agents**: No agent definitions source configured; agent-suggester.ts never receives data

The infrastructure for all three exists and is tested - they just need wiring at the entry point.

## Suggested Specify Prompt

```
Wire up missing context sources (tools, skills, agents) in the prompt improvement pipeline.

**Current State:**
- Git context: Working
- Memory context: Working
- Tools context: Broken - available_tools from stdin never extracted
- Skills context: Broken - no skill rules source
- Agents context: Broken - no agent definitions source
- Dynamic discovery: Infrastructure exists but never invoked

**Requirements:**
1. Extract available_tools from Claude Code stdin in parseHookInput()
2. Pass availableTools through processPrompt() to buildContext()
3. Add dynamicDiscovery integration toggle to config
4. Wire dynamicDiscoveryOptions in main() to discover skills/agents at runtime
5. Maintain backward compatibility - no breaking changes to existing integrations
6. Follow existing patterns for integration wiring (see git/memory as examples)

**Success Criteria:**
- Improved prompts include <available_tools> section when tools are available
- Improved prompts include <available_skills> section when skills match prompt keywords
- Improved prompts include <suggested_agents> section when agents match prompt keywords
- All existing tests pass
- New tests cover the wiring changes
```

## Suggested Plan Prompt

```
Implement wiring for tools, skills, and agents context sources.

**Technical Approach:**
- No new libraries needed - all infrastructure exists
- Follow established patterns in context-builder.ts
- Use existing detectTools(), matchSkills(), suggestAgents() functions
- Wire dynamicDiscovery as async integration (like git, memory)

**Architecture:**
1. Entry point changes in improve-prompt.ts main():
   - Extract context.available_tools from parsed stdin
   - Add dynamicDiscoveryOptions to buildImprovementContext call

2. Type changes in types.ts:
   - Add dynamicDiscovery to IntegrationToggles interface

3. Config changes in config-loader.ts:
   - Add dynamicDiscovery default (true)
   - Parse dynamicDiscovery from config file

4. Context builder already supports all sources - no changes needed

**Testing Strategy:**
- Unit tests for stdin extraction
- Integration test for full flow with tools/skills/agents
- Verify existing tests still pass
```

## Research Notes

### Architecture Analysis

**Current Data Flow (Broken):**
```
stdin.available_tools → [DROPPED] → processPrompt (undefined) → buildContext (undefined)
```

**Fixed Data Flow:**
```
stdin.available_tools → parseHookInput → main() → processPrompt → buildContext → detectTools()
dynamic discovery → main() → processPrompt → buildContext → gatherDynamicContext()
```

### Recommended Approach: Wire Tools + Enable Dynamic Discovery

**Rationale:**
1. Tools fix is trivial - just extract and pass through (~10 lines)
2. Dynamic discovery infrastructure is complete and tested
3. Skills/agents can be discovered at runtime without config
4. Follows existing patterns - no architectural changes needed

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| A: Tools only | Quick, minimal changes | Skills/agents remain broken |
| B: Tools + config-based skills/agents | Full control | Requires user to configure skill rules |
| **C: Tools + dynamic discovery** | **Auto-discovers skills/agents** | **Slight performance cost (directory scan)** |

**Selected: Option C** - Dynamic discovery already works, just needs wiring. Auto-discovery is better UX than manual configuration.

### Key Considerations

**Performance:**
- Tools detection: Synchronous, fast (array operations only)
- Dynamic discovery: Async, scans `.claude/` directories
- Both are already optimised with caching and early returns

**Backward Compatibility:**
- No breaking changes to existing config
- New `dynamicDiscovery` toggle defaults to `true`
- Existing integrations unaffected

**Testing:**
- Tool detection has 100% test coverage
- Skill matcher has comprehensive tests
- Agent suggester has comprehensive tests
- Dynamic discovery has extensive tests
- Need integration test for full wiring

### Files to Modify

| File | Change |
|------|--------|
| `hooks/user-prompt-submit/improve-prompt.ts` | Extract available_tools, add dynamicDiscoveryOptions |
| `hooks/src/core/types.ts` | Add dynamicDiscovery to IntegrationToggles |
| `hooks/src/core/config-loader.ts` | Add dynamicDiscovery default and parsing |
| `hooks/user-prompt-submit/improve-prompt.spec.ts` | Add tests for new wiring |

### Open Questions

1. Should `dynamicDiscovery` be enabled by default? **Recommendation: Yes**
2. Should we also fix LSP and session stubs? **Recommendation: Separate PR**
3. Should tools context include MCP tool descriptions? **Recommendation: Future enhancement**

## References

- Architecture report from Explore agent (session context)
- Existing patterns in `git-context.ts` and `memory-plugin.ts`
- Dynamic discovery implementation in `dynamic-discovery.ts`

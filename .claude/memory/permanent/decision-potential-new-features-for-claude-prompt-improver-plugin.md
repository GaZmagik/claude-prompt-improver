---
id: decision-potential-new-features-for-claude-prompt-improver-plugin
title: Potential new features for Claude Prompt Improver Plugin
type: decision
scope: project
created: "2026-01-19T13:05:28.868Z"
updated: "2026-01-19T13:05:28.868Z"
tags:
  - promoted-from-think
  - project
---

# Potential new features for Claude Prompt Improver Plugin

**Decision: Implement Visibility-First MVP for Prompt Improver Plugin**

**Core Problem Identified:**
Plugin hooks execute but prompt improvements are invisible - users cannot diagnose whether improvement was skipped (bypass conditions) or failed silently (classification/generation errors).

**Critical Constraint Clarification:**
The <100ms hook latency budget is incompatible with LLM-based prompt improvement. Classification + improvement generation will take 2-30s depending on complexity. The plugin must embrace async/visible feedback rather than attempting transparent synchronous improvement.

**MVP Features (Priority Order):**

1. **Explicit Improvement Report** - Show what happened:
   - Improvement status: skipped/attempted/applied
   - If skipped: specific bypass reason (short prompt, forked session, low context)
   - If attempted: token count before/after, 3-bullet summary of changes
   - If failed: error type and troubleshooting hint

2. **Structured Logging** - Debug-friendly output:
   - Log to .claude/logs/prompt-improver-<timestamp>.log
   - Include: classification result, improvement strategy, execution timing, bypass decision logic
   - Avoid logging full prompt content (security/privacy concern)
   - Use log levels: ERROR (failures), INFO (decisions), DEBUG (trace)

3. **Force Improvement Toggle** - Simple override:
   - Single config: `force_improve: boolean`
   - When true: bypasses all heuristic checks
   - Allows testing whether improvement works at all vs bypass logic preventing it

**Implementation Priorities:**
1. Visibility (solves immediate diagnosis problem)
2. Control (enables experimentation)
3. Performance optimisation (only after visibility shows where time is spent)

**Security Safeguards:**
- Never log full prompt text (summarise: length, first 50 chars, classification)
- Use structured JSON logs for parsing, not freeform text
- Implement log rotation to prevent disk exhaustion

**Next Steps:**
Enter plan mode to design implementation approach for visibility MVP.

_Deliberation: `thought-20260119-125700073`_

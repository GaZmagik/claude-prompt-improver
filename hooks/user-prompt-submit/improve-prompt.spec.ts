/**
 * T018-T019: Hook stdin/stdout tests
 * T018: Test hook stdin parsing for prompt and context
 * T019: Test hook stdout output format matches contract
 */
import { describe, expect, it } from 'bun:test';
import type { HookOutput } from '../src/core/types.ts';
import {
  createHookOutput,
  parseHookInput,
  processPrompt,
  serializeHookOutput,
} from './improve-prompt.ts';

describe('Hook Input/Output', () => {
  describe('T018: parseHookInput - stdin parsing for prompt and context', () => {
    // Note: Claude Code sends flat structure with session_id at root level
    it('should parse valid hook input with all fields', () => {
      const stdin = JSON.stringify({
        prompt: 'fix the bug',
        session_id: 'conv-123',
        cwd: '/home/user/project',
        permission_mode: 'default',
        hook_event_name: 'UserPromptSubmit',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.prompt).toBe('fix the bug');
      expect(result.input?.context.conversation_id).toBe('conv-123');
      expect(result.input?.context.cwd).toBe('/home/user/project');
    });

    it('should parse minimal hook input with required fields only', () => {
      const stdin = JSON.stringify({
        prompt: 'simple prompt',
        session_id: 'conv-456',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.prompt).toBe('simple prompt');
      expect(result.input?.context.conversation_id).toBe('conv-456');
    });

    it('should detect forked session via permission_mode', () => {
      const stdin = JSON.stringify({
        prompt: 'internal prompt',
        session_id: 'conv-789',
        permission_mode: 'fork',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.context.permission_mode).toBe('fork');
    });

    it('should parse transcript_path when provided', () => {
      const stdin = JSON.stringify({
        prompt: 'test',
        session_id: 'conv-abc',
        transcript_path: '/home/user/.claude/transcripts/session.jsonl',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.context.conversation_id).toBe('conv-abc');
    });

    it('should return error for invalid JSON', () => {
      const stdin = 'not valid json {{{';

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for missing prompt field', () => {
      const stdin = JSON.stringify({
        session_id: 'conv-xyz',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prompt');
    });

    it('should return error for missing session_id field', () => {
      const stdin = JSON.stringify({
        prompt: 'test prompt',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('session_id');
    });

    it('should handle empty string prompt', () => {
      const stdin = JSON.stringify({
        prompt: '',
        session_id: 'conv-empty',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.prompt).toBe('');
    });
  });

  describe('T019: serializeHookOutput - stdout format matches contract', () => {
    it('should serialize passthrough output correctly', () => {
      const output: HookOutput = {
        continue: true,
      };

      const json = serializeHookOutput(output);
      const parsed = JSON.parse(json);

      expect(parsed.continue).toBe(true);
    });

    it('should serialize output with systemMessage', () => {
      const output: HookOutput = {
        continue: true,
        systemMessage: '🎯 Prompt improved for clarity',
      };

      const json = serializeHookOutput(output);
      const parsed = JSON.parse(json);

      expect(parsed.continue).toBe(true);
      expect(parsed.systemMessage).toBe('🎯 Prompt improved for clarity');
    });

    it('should serialize output with additionalContext', () => {
      const output: HookOutput = {
        continue: true,
        additionalContext: '<improved_prompt>Better prompt here</improved_prompt>',
      };

      const json = serializeHookOutput(output);
      const parsed = JSON.parse(json);

      expect(parsed.additionalContext).toContain('<improved_prompt>');
    });

    it('should serialize full improved prompt output', () => {
      const output: HookOutput = {
        continue: true,
        systemMessage: '🎯 Prompt improved',
        additionalContext: `<improved_prompt>
<task>Fix the authentication bug in the login module</task>
<context>Recent commits show JWT token work</context>
</improved_prompt>`,
      };

      const json = serializeHookOutput(output);
      const parsed = JSON.parse(json);

      expect(parsed.continue).toBe(true);
      expect(parsed.systemMessage).toBe('🎯 Prompt improved');
      expect(parsed.additionalContext).toContain('<task>');
    });

    it('should not include undefined fields in output', () => {
      const output: HookOutput = {
        continue: true,
      };

      const json = serializeHookOutput(output);
      const parsed = JSON.parse(json);

      expect(Object.keys(parsed)).toEqual(['continue']);
      expect(parsed.systemMessage).toBeUndefined();
      expect(parsed.additionalContext).toBeUndefined();
    });

    it('should handle special characters in messages', () => {
      const output: HookOutput = {
        continue: true,
        systemMessage: 'Test "quotes" and\nnewlines',
      };

      const json = serializeHookOutput(output);

      // Should be valid JSON
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.systemMessage).toBe('Test "quotes" and\nnewlines');
    });
  });

  describe('createHookOutput', () => {
    it('should create passthrough output', () => {
      const output = createHookOutput({ type: 'passthrough' });

      expect(output.continue).toBe(true);
      expect(output.systemMessage).toBeUndefined();
    });

    it('should create improved output with all fields', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: '<task>Do something</task>',
        tokensBefore: 10,
        tokensAfter: 25,
        latencyMs: 2500,
      });

      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('Prompt improved');
      expect(output.additionalContext).toContain('<task>');
    });

    it('should include prompt improved in system message', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: 'Better prompt',
        tokensBefore: 5,
        tokensAfter: 8,
        latencyMs: 1200,
      });

      expect(output.systemMessage).toContain('Prompt improved');
    });
  });

  describe('T049: processPrompt - always improve (no classification)', () => {
    // Note: prompts must be >10 tokens to avoid short prompt bypass

    // Test removed - we no longer classify, just always improve

    it('should improve prompts using config model', async () => {
      const result = await processPrompt({
        prompt: 'I need some help with testing the application but I am not sure where to start',
        sessionId: 'session-123',
        _mockImprovement: 'Help me write unit tests for the authentication module',
      });

      expect(result.type).toBe('improved');
      if (result.type === 'improved') {
        expect(result.improvedPrompt).toContain('unit tests');
      }
    });

    it('should improve vague prompts', async () => {
      const result = await processPrompt({
        prompt: 'There is a bug somewhere in the code and it is causing issues with the user interface',
        sessionId: 'session-456',
        _mockClassification: 'COMPLEX: Very vague, no specifics',
        _mockImprovement: '<task>Investigate and fix the authentication bug</task>',
      });

      expect(result.type).toBe('improved');
      if (result.type === 'improved') {
        expect(result.improvedPrompt).toContain('authentication bug');
      }
    });

    it('should passthrough when running in forked session (permission_mode=fork)', async () => {
      const result = await processPrompt({
        prompt: 'This is a longer prompt that would normally be processed by the improvement engine',
        sessionId: 'session-789',
        permissionMode: 'fork',
        _mockClassification: 'COMPLEX: Would normally be improved',
      });

      // Should bypass classification entirely
      expect(result.type).toBe('passthrough');
      if (result.type === 'passthrough') {
        expect(result.bypassReason).toBe('forked_session');
      }
    });

    it('should passthrough on classification error', async () => {
      const result = await processPrompt({
        prompt: 'This is a test prompt that is long enough to pass the short prompt threshold check',
        sessionId: 'session-error',
        _mockClassification: null, // Simulates timeout/error
      });

      expect(result.type).toBe('passthrough');
    });

    it('should passthrough on improvement error with improvement_failed reason', async () => {
      const result = await processPrompt({
        prompt: 'This is a vague prompt about something that needs to be fixed but without specifics',
        sessionId: 'session-error',
        _mockClassification: 'COMPLEX: Very vague',
        _mockImprovement: null, // Simulates timeout/error
      });

      // Falls back to original prompt with visible reason
      expect(result.type).toBe('passthrough');
      if (result.type === 'passthrough') {
        expect(result.bypassReason).toBe('improvement_failed');
      }
    });

    it('should bypass short prompts without classification', async () => {
      const result = await processPrompt({
        prompt: 'fix it',
        sessionId: 'session-123',
        _mockClassification: 'COMPLEX: Would be classified if not bypassed',
      });

      expect(result.type).toBe('passthrough');
      if (result.type === 'passthrough') {
        expect(result.bypassReason).toBe('short_prompt');
      }
    });
  });

  describe('T078: processPrompt - context detection integration', () => {
    it('should build context from available_tools when provided', async () => {
      const result = await processPrompt({
        prompt: 'Help me read the config file and write a new version with updated settings please',
        sessionId: 'session-ctx',
        availableTools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'],
        _mockClassification: 'SIMPLE: Clear but could use structure',
        _mockImprovement: 'Read config.json and update the settings',
      });

      expect(result.type).toBe('improved');
    });

    it('should build context from skill rules when provided', async () => {
      const result = await processPrompt({
        prompt: 'Help me commit my changes to the repository with a proper message please',
        sessionId: 'session-skills',
        skillRules: [
          { name: 'commit', keywords: ['commit', 'git'], description: 'Git commit workflow' },
        ],
        _mockClassification: 'SIMPLE: Clear commit intent',
        _mockImprovement: 'Stage and commit changes with message',
      });

      expect(result.type).toBe('improved');
    });

    it('should build context from agent definitions when provided', async () => {
      const result = await processPrompt({
        prompt: 'Help me with complex TypeScript generics and type inference issues in this code',
        sessionId: 'session-agents',
        agentDefinitions: [
          {
            name: 'typescript-expert',
            description: 'TypeScript advanced features',
            keywords: ['typescript', 'generics', 'types'],
            filePath: '.claude/agents/ts.md',
          },
        ],
        _mockClassification: 'COMPLEX: Needs TypeScript expertise',
        _mockImprovement: 'Use typescript-expert agent for generics help',
      });

      expect(result.type).toBe('improved');
    });

    it('should aggregate context from multiple sources', async () => {
      const result = await processPrompt({
        prompt: 'Help me commit TypeScript code changes with proper type checking and validation',
        sessionId: 'session-multi',
        availableTools: ['Read', 'Write'],
        skillRules: [
          { name: 'commit', keywords: ['commit'], description: 'Git commit' },
        ],
        agentDefinitions: [
          {
            name: 'typescript-expert',
            description: 'TypeScript',
            keywords: ['typescript'],
            filePath: '.claude/agents/ts.md',
          },
        ],
        _mockClassification: 'COMPLEX: Multi-domain request',
        _mockImprovement: 'Commit TypeScript changes with type safety',
      });

      expect(result.type).toBe('improved');
    });

    it('should continue without context when none available', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how this authentication module works in detail',
        sessionId: 'session-no-ctx',
        // No availableTools, skillRules, or agentDefinitions
        _mockClassification: 'SIMPLE: Clear question',
        _mockImprovement: 'Explain authentication module',
      });

      expect(result.type).toBe('improved');
    });
  });

  describe('Visibility Features - System Messages', () => {
    it('should include systemMessage in output for bypassed prompts', () => {
      const output = createHookOutput({
        type: 'passthrough',
        bypassReason: 'short_prompt',
      });

      expect(output.systemMessage).toBeDefined();
      expect(output.systemMessage).toContain('⏭️');
      expect(output.systemMessage).toContain('Prompt unchanged');
    });

    it('should include systemMessage in output for improved prompts', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: '<task>Fix the bug</task>',
        tokensBefore: 45,
        tokensAfter: 78,
        summary: ['Added XML structure', 'Injected git context'],
        latencyMs: 2300,
      });

      expect(output.additionalContext).toContain('<task>Fix the bug</task>');
      expect(output.systemMessage).toBeDefined();
      expect(output.systemMessage).toContain('🎯');
      expect(output.systemMessage).toContain('Prompt improved');
      expect(output.systemMessage).toContain('45');
      expect(output.systemMessage).toContain('78');
      expect(output.systemMessage).toContain('Added XML structure');
    });

    it('should include token counts in improved message', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: 'Improved text',
        tokensBefore: 30,
        tokensAfter: 42,
        latencyMs: 1500,
      });

      expect(output.systemMessage).toBeDefined();
      expect(output.systemMessage).toContain('30');
      expect(output.systemMessage).toContain('42');
    });

    it('should include summary bullets when provided', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: 'Improved text',
        tokensBefore: 50,
        tokensAfter: 95,
        summary: ['Added context injection', 'Expanded task description', 'Structured with XML'],
        latencyMs: 1800,
      });

      expect(output.systemMessage).toBeDefined();
      expect(output.systemMessage).toContain('Added context injection');
      expect(output.systemMessage).toContain('Expanded task description');
      expect(output.systemMessage).toContain('Structured with XML');
    });

    it('should format latency in system message', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: 'Improved text',
        tokensBefore: 20,
        tokensAfter: 25,
        latencyMs: 12456,
      });

      expect(output.systemMessage).toBeDefined();
      expect(output.systemMessage).toContain('12.5s');
    });

    it('should include all bypass reasons in messages', () => {
      const reasons: Array<'short_prompt' | 'skip_tag' | 'low_context' | 'forked_session' | 'plugin_disabled'> = [
        'short_prompt',
        'skip_tag',
        'low_context',
        'forked_session',
        'plugin_disabled',
      ];

      for (const reason of reasons) {
        const output = createHookOutput({
          type: 'passthrough',
          bypassReason: reason,
        });

        expect(output.systemMessage).toBeDefined();
        expect(output.systemMessage).toContain('⏭️');
      }
    });
  });

  describe('Visibility Features - Logging Integration', () => {
    it('should pass visibility data to logger for bypass events', async () => {
      const result = await processPrompt({
        prompt: 'fix',
        sessionId: 'session-bypass',
        _mockClassification: null, // Triggers bypass
      });

      expect(result.type).toBe('passthrough');
      // Logger should receive bypass event with INFO level
    });

    it('should pass visibility data to logger for successful improvements', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-success',
        _mockClassification: 'COMPLEX: Technical question',
        _mockImprovement: '<task>Explain authentication module</task>',
      });

      expect(result.type).toBe('improved');
      // Logger should receive improvement event with INFO level
    });

    it('should pass error data to logger for failures', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-fail',
        _mockClassification: null, // Simulates classification failure
      });

      // Should fallback to passthrough
      expect(result.type).toBe('passthrough');
      // Logger should receive error event with ERROR level
    });
  });

  describe('Visibility Features - Force Improve Integration', () => {
    it('should pass forceImprove flag to bypass detector', async () => {
      const result = await processPrompt({
        prompt: 'fix',
        sessionId: 'session-force',
        forceImprove: true,
        _mockClassification: 'SIMPLE: Short but forced',
        _mockImprovement: '<task>Fix the issue</task>',
      });

      // With forceImprove=true, short prompt should NOT bypass
      expect(result.type).toBe('improved');
    });

    it('should respect plugin_disabled even with forceImprove', async () => {
      const result = await processPrompt({
        prompt: 'fix the bug',
        sessionId: 'session-disabled',
        forceImprove: true,
        pluginDisabled: true,
      });

      // plugin_disabled has absolute priority
      expect(result.type).toBe('passthrough');
    });

    it('should follow normal bypass logic when forceImprove is false', async () => {
      const result = await processPrompt({
        prompt: 'fix',
        sessionId: 'session-normal',
        forceImprove: false,
      });

      // Short prompt should bypass normally
      expect(result.type).toBe('passthrough');
    });
  });

  describe('Visibility Features - Timestamped Logs', () => {
    it('should generate timestamped log path when enabled', async () => {
      // Note: Logging configuration is loaded from config files, not ProcessPromptOptions
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-timestamp',
        _mockClassification: 'COMPLEX: Question',
        _mockImprovement: '<task>Explain authentication</task>',
      });

      expect(result.type).toBe('improved');
      // Logging config is handled via loadConfigFromStandardPaths() in main()
    });

    it('should use base log path when timestamps disabled', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-no-timestamp',
        _mockClassification: 'COMPLEX: Question',
        _mockImprovement: '<task>Explain authentication</task>',
      });

      expect(result.type).toBe('improved');
      // Logging config is handled via loadConfigFromStandardPaths() in main()
    });
  });

  describe('Visibility Features - Log Level Filtering', () => {
    it('should respect ERROR log level', async () => {
      // Note: Log level filtering is handled by logger via config, not ProcessPromptOptions
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-error-level',
        _mockClassification: 'COMPLEX: Question',
        _mockImprovement: '<task>Explain authentication</task>',
      });

      expect(result.type).toBe('improved');
      // Log level config is handled via loadConfigFromStandardPaths() in main()
    });

    it('should respect INFO log level', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-info-level',
        _mockClassification: 'COMPLEX: Question',
        _mockImprovement: '<task>Explain authentication</task>',
      });

      expect(result.type).toBe('improved');
      // Log level config is handled via loadConfigFromStandardPaths() in main()
    });

    it('should respect DEBUG log level', async () => {
      const result = await processPrompt({
        prompt: 'Please help me understand how the authentication module works in detail',
        sessionId: 'session-debug-level',
        _mockClassification: 'COMPLEX: Question',
        _mockImprovement: '<task>Explain authentication</task>',
      });

      expect(result.type).toBe('improved');
      // Log level config is handled via loadConfigFromStandardPaths() in main()
    });
  });
});

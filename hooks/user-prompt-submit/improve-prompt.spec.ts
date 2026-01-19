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
    it('should parse valid hook input with all fields', () => {
      const stdin = JSON.stringify({
        prompt: 'fix the bug',
        context: {
          conversation_id: 'conv-123',
          message_index: 5,
          available_tools: ['Read', 'Write', 'Edit'],
          enabled_mcp_servers: ['ripgrep'],
          context_usage: {
            used: 12345,
            max: 200000,
            auto_compaction_enabled: true,
          },
          session_settings: {
            model: 'claude-sonnet-4-5',
            skills: ['memory', 'typescript-expert'],
          },
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.prompt).toBe('fix the bug');
      expect(result.input?.context.conversation_id).toBe('conv-123');
      expect(result.input?.context.message_index).toBe(5);
      expect(result.input?.context.available_tools).toContain('Read');
    });

    it('should parse minimal hook input with required fields only', () => {
      const stdin = JSON.stringify({
        prompt: 'simple prompt',
        context: {
          conversation_id: 'conv-456',
          message_index: 0,
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.prompt).toBe('simple prompt');
      expect(result.input?.context.conversation_id).toBe('conv-456');
    });

    it('should detect forked session via permission_mode', () => {
      const stdin = JSON.stringify({
        prompt: 'internal prompt',
        context: {
          conversation_id: 'conv-789',
          message_index: 1,
          permission_mode: 'fork',
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.context.permission_mode).toBe('fork');
    });

    it('should parse context_usage for compaction detection', () => {
      const stdin = JSON.stringify({
        prompt: 'test',
        context: {
          conversation_id: 'conv-abc',
          message_index: 100,
          context_usage: {
            used: 190000,
            max: 200000,
            auto_compaction_enabled: true,
          },
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(true);
      expect(result.input?.context.context_usage?.used).toBe(190000);
      expect(result.input?.context.context_usage?.max).toBe(200000);
    });

    it('should return error for invalid JSON', () => {
      const stdin = 'not valid json {{{';

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for missing prompt field', () => {
      const stdin = JSON.stringify({
        context: {
          conversation_id: 'conv-xyz',
          message_index: 0,
        },
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prompt');
    });

    it('should return error for missing context field', () => {
      const stdin = JSON.stringify({
        prompt: 'test prompt',
      });

      const result = parseHookInput(stdin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('context');
    });

    it('should handle empty string prompt', () => {
      const stdin = JSON.stringify({
        prompt: '',
        context: {
          conversation_id: 'conv-empty',
          message_index: 0,
        },
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
        classification: 'COMPLEX',
      });

      expect(output.continue).toBe(true);
      expect(output.systemMessage).toContain('COMPLEX');
      expect(output.additionalContext).toContain('<task>');
    });

    it('should include classification in system message', () => {
      const output = createHookOutput({
        type: 'improved',
        improvedPrompt: 'Better prompt',
        classification: 'SIMPLE',
      });

      expect(output.systemMessage).toContain('SIMPLE');
    });
  });

  describe('T049: processPrompt - integration of classification and improvement', () => {
    // Note: prompts must be >10 tokens to avoid short prompt bypass

    it('should passthrough when classification is NONE', async () => {
      const result = await processPrompt({
        prompt: 'Read the src/auth.ts file and explain how the JWT validation logic works in detail',
        sessionId: 'session-123',
        _mockClassification: 'NONE: Well-structured, clear prompt',
      });

      expect(result.type).toBe('passthrough');
    });

    it('should improve with haiku when classification is SIMPLE', async () => {
      const result = await processPrompt({
        prompt: 'I need some help with testing the application but I am not sure where to start',
        sessionId: 'session-123',
        _mockClassification: 'SIMPLE: Needs minor clarification about what to test',
        _mockImprovement: 'Help me write unit tests for the authentication module',
      });

      expect(result.type).toBe('improved');
      if (result.type === 'improved') {
        expect(result.improvedPrompt).toContain('unit tests');
        expect(result.classification).toBe('SIMPLE');
      }
    });

    it('should improve with sonnet when classification is COMPLEX', async () => {
      const result = await processPrompt({
        prompt: 'There is a bug somewhere in the code and it is causing issues with the user interface',
        sessionId: 'session-456',
        _mockClassification: 'COMPLEX: Very vague, no specifics',
        _mockImprovement: '<task>Investigate and fix the authentication bug</task>',
      });

      expect(result.type).toBe('improved');
      if (result.type === 'improved') {
        expect(result.improvedPrompt).toContain('authentication bug');
        expect(result.classification).toBe('COMPLEX');
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

    it('should passthrough on improvement error but with NONE fallback', async () => {
      const result = await processPrompt({
        prompt: 'This is a vague prompt about something that needs to be fixed but without specifics',
        sessionId: 'session-error',
        _mockClassification: 'COMPLEX: Very vague',
        _mockImprovement: null, // Simulates timeout/error
      });

      // Falls back to original prompt
      expect(result.type).toBe('passthrough');
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
});

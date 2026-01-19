/**
 * T070-T073: Context Builder tests
 * T070: Test context builder aggregates from multiple sources
 * T071: Test context builder handles source failures gracefully
 * T072: Test context builder enforces 2s timeout per source
 * T073: Test context builder formats context for injection
 */
import { describe, expect, it } from 'bun:test';
import {
  buildContext,
  formatContextForInjection,
  type ContextBuilderInput,
  type BuiltContext,
  type ContextSource,
} from './context-builder.ts';
import { CONTEXT_GATHERING_TIMEOUT_MS } from '../core/constants.ts';

describe('Context Builder', () => {
  describe('T070: buildContext - aggregates from multiple sources', () => {
    it('should aggregate tools context when available', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help with code',
        availableTools: ['Read', 'Write', 'Edit', 'Bash'],
      };

      const result = await buildContext(input);

      expect(result.sources).toContain('tools');
      expect(result.tools).toBeDefined();
      expect(result.tools?.count).toBe(4);
    });

    it('should aggregate skills context when rules provided', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help me commit changes',
        skillRules: [
          { name: 'commit', keywords: ['commit', 'git'], description: 'Git workflow' },
        ],
      };

      const result = await buildContext(input);

      expect(result.sources).toContain('skills');
      expect(result.skills).toBeDefined();
      expect(result.skills?.length).toBeGreaterThan(0);
    });

    it('should aggregate agents context when definitions provided', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help with TypeScript generics',
        agentDefinitions: [
          {
            name: 'typescript-expert',
            description: 'TypeScript help',
            keywords: ['typescript', 'generics'],
            filePath: '.claude/agents/ts.md',
          },
        ],
      };

      const result = await buildContext(input);

      expect(result.sources).toContain('agents');
      expect(result.agents).toBeDefined();
    });

    it('should aggregate multiple sources simultaneously', async () => {
      const input: ContextBuilderInput = {
        prompt: 'commit TypeScript code',
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
      };

      const result = await buildContext(input);

      expect(result.sources).toContain('tools');
      expect(result.sources).toContain('skills');
      expect(result.sources).toContain('agents');
    });

    it('should return empty sources when no context available', async () => {
      const input: ContextBuilderInput = {
        prompt: 'hello world',
      };

      const result = await buildContext(input);

      expect(result.sources.length).toBe(0);
    });
  });

  describe('T071: buildContext - handles source failures gracefully', () => {
    it('should continue when tools detection fails', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help',
        // availableTools omitted to test failure path
        skillRules: [
          { name: 'memory', keywords: ['help'], description: 'Memory' },
        ],
      };

      const result = await buildContext(input);

      // Should still have skills even if tools failed
      expect(result.sources).toContain('skills');
    });

    it('should continue when skill matching fails', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help',
        availableTools: ['Read', 'Write'],
        // skillRules omitted to test failure path
      };

      const result = await buildContext(input);

      // Should still have tools even if skills failed
      expect(result.sources).toContain('tools');
    });

    it('should continue when agent suggestion fails', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help',
        availableTools: ['Read'],
        // agentDefinitions omitted to test failure path
      };

      const result = await buildContext(input);

      // Should still have tools even if agents failed
      expect(result.sources).toContain('tools');
    });

    it('should track which sources succeeded', async () => {
      const input: ContextBuilderInput = {
        prompt: 'commit code',
        availableTools: ['Read'],
        skillRules: [
          { name: 'commit', keywords: ['commit'], description: 'Git' },
        ],
      };

      const result = await buildContext(input);

      // Sources should only include successful ones
      for (const source of result.sources) {
        expect(['tools', 'skills', 'agents']).toContain(source);
      }
    });

    it('should not include failed sources in result', async () => {
      const input: ContextBuilderInput = {
        prompt: 'hello',
        availableTools: ['Read'],
        // No skill rules or agents
      };

      const result = await buildContext(input);

      expect(result.sources).not.toContain('skills');
      expect(result.sources).not.toContain('agents');
    });
  });

  describe('T072: buildContext - enforces 2s timeout per source', () => {
    it('should use correct timeout value from constants', () => {
      expect(CONTEXT_GATHERING_TIMEOUT_MS).toBe(2000);
    });

    it('should complete within reasonable time', async () => {
      const input: ContextBuilderInput = {
        prompt: 'help with code',
        availableTools: ['Read', 'Write', 'Edit'],
        skillRules: [
          { name: 'commit', keywords: ['commit'], description: 'Git' },
        ],
        agentDefinitions: [
          { name: 'ts', description: 'TS', keywords: ['typescript'], filePath: '' },
        ],
      };

      const start = performance.now();
      await buildContext(input);
      const elapsed = performance.now() - start;

      // Should complete in under 100ms for synchronous sources
      expect(elapsed).toBeLessThan(100);
    });

    it('should respect overall timeout', async () => {
      const input: ContextBuilderInput = {
        prompt: 'test timeout',
        availableTools: ['Read'],
        timeoutMs: 50, // Very short timeout for testing
      };

      const start = performance.now();
      await buildContext(input);
      const elapsed = performance.now() - start;

      // Should complete around the timeout
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('T073: formatContextForInjection - formats context', () => {
    it('should format tools context for injection', () => {
      const context: BuiltContext = {
        sources: ['tools'],
        tools: {
          tools: ['Read', 'Write'],
          coreTools: ['Read', 'Write'],
          mcpTools: [],
          count: 2,
          hasRead: true,
          hasWrite: true,
          hasEdit: false,
          hasGrep: false,
          hasGlob: false,
          hasBash: false,
        },
      };

      const result = formatContextForInjection(context);

      expect(result.tools).toBeDefined();
      expect(result.tools).toContain('Read');
    });

    it('should format skills context for injection', () => {
      const context: BuiltContext = {
        sources: ['skills'],
        skills: [
          {
            skill: { name: 'commit', keywords: ['commit'], description: 'Git' },
            matchedKeywords: ['commit'],
          },
        ],
      };

      const result = formatContextForInjection(context);

      expect(result.skills).toBeDefined();
      expect(result.skills).toContain('commit');
    });

    it('should format agents context for injection', () => {
      const context: BuiltContext = {
        sources: ['agents'],
        agents: [
          {
            agent: { name: 'ts-expert', description: 'TS', keywords: [], filePath: '' },
            score: 1,
            matchedKeywords: ['typescript'],
          },
        ],
      };

      const result = formatContextForInjection(context);

      expect(result.agents).toBeDefined();
      expect(result.agents).toContain('ts-expert');
    });

    it('should return empty object for no context', () => {
      const context: BuiltContext = {
        sources: [],
      };

      const result = formatContextForInjection(context);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should format all available sources', () => {
      const context: BuiltContext = {
        sources: ['tools', 'skills', 'agents'],
        tools: {
          tools: ['Read'],
          coreTools: ['Read'],
          mcpTools: [],
          count: 1,
          hasRead: true,
          hasWrite: false,
          hasEdit: false,
          hasGrep: false,
          hasGlob: false,
          hasBash: false,
        },
        skills: [
          {
            skill: { name: 'commit', keywords: [], description: 'Git' },
            matchedKeywords: ['commit'],
          },
        ],
        agents: [
          {
            agent: { name: 'expert', description: 'Help', keywords: [], filePath: '' },
            score: 1,
            matchedKeywords: [],
          },
        ],
      };

      const result = formatContextForInjection(context);

      expect(result.tools).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.agents).toBeDefined();
    });
  });
});

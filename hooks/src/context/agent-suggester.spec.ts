/**
 * T067-T069: Agent Suggester tests
 * T067: Test agent suggester reads agent definitions from .claude/agents/
 * T068: Test agent suggester matches prompt keywords to agent descriptions
 * T069: Test agent suggester gracefully skips if no agents configured
 */
import { describe, expect, it } from 'bun:test';
import {
  suggestAgents,
  parseAgentDefinition,
  formatAgentsContext,
  type AgentDefinition,
  type SuggestedAgent,
} from './agent-suggester.ts';

describe('Agent Suggester', () => {
  describe('T067: parseAgentDefinition - reads agent definitions', () => {
    it('should parse agent definition from markdown content', () => {
      const markdown = `---
name: typescript-expert
description: Use for complex TypeScript tasks
---

# TypeScript Expert Agent

Expert in TypeScript development.`;

      const result = parseAgentDefinition(markdown, 'typescript-expert.md');

      expect(result?.name).toBe('typescript-expert');
      expect(result?.description).toContain('TypeScript');
    });

    it('should extract name from frontmatter', () => {
      const markdown = `---
name: security-reviewer
description: Security code review
---
Content here`;

      const result = parseAgentDefinition(markdown, 'security.md');

      expect(result?.name).toBe('security-reviewer');
    });

    it('should extract description from frontmatter', () => {
      const markdown = `---
name: test-agent
description: This agent helps with testing and QA tasks
---
Content`;

      const result = parseAgentDefinition(markdown, 'test.md');

      expect(result?.description).toBe('This agent helps with testing and QA tasks');
    });

    it('should use filename as fallback name', () => {
      const markdown = `---
description: No name provided
---
Content`;

      const result = parseAgentDefinition(markdown, 'my-agent.md');

      expect(result?.name).toBe('my-agent');
    });

    it('should return null for empty content', () => {
      const result = parseAgentDefinition('', 'empty.md');

      expect(result).toBeNull();
    });

    it('should return null for content without frontmatter', () => {
      const markdown = `# Just a title
No frontmatter here`;

      const result = parseAgentDefinition(markdown, 'no-front.md');

      expect(result).toBeNull();
    });

    it('should extract keywords from description', () => {
      const markdown = `---
name: python-expert
description: Use for Python async await and type hints
---`;

      const result = parseAgentDefinition(markdown, 'python.md');

      expect(result?.keywords).toContain('python');
      expect(result?.keywords).toContain('async');
    });
  });

  describe('T068: suggestAgents - matches prompt keywords to agent descriptions', () => {
    const sampleAgents: AgentDefinition[] = [
      {
        name: 'typescript-expert',
        description: 'Use for TypeScript generics and type system tasks',
        keywords: ['typescript', 'generics', 'type', 'types'],
        filePath: '.claude/agents/typescript-expert.md',
      },
      {
        name: 'security-reviewer',
        description: 'Security review and vulnerability detection',
        keywords: ['security', 'vulnerability', 'review', 'audit'],
        filePath: '.claude/agents/security-reviewer.md',
      },
      {
        name: 'test-expert',
        description: 'Testing, TDD, and test automation',
        keywords: ['test', 'testing', 'tdd', 'spec', 'automation'],
        filePath: '.claude/agents/test-expert.md',
      },
    ];

    it('should match prompt to relevant agent', () => {
      const result = suggestAgents('help with TypeScript generics', sampleAgents);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.agent.name).toBe('typescript-expert');
    });

    it('should match multiple agents when relevant', () => {
      const result = suggestAgents('security review of TypeScript code', sampleAgents);

      expect(result.length).toBe(2);
      const names = result.map(r => r.agent.name);
      expect(names).toContain('typescript-expert');
      expect(names).toContain('security-reviewer');
    });

    it('should be case-insensitive', () => {
      const result = suggestAgents('TYPESCRIPT HELP', sampleAgents);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.agent.name).toBe('typescript-expert');
    });

    it('should return empty array for no matches', () => {
      const result = suggestAgents('help with cooking recipes', sampleAgents);

      expect(result).toEqual([]);
    });

    it('should sort by relevance score (most relevant first)', () => {
      const result = suggestAgents('TypeScript type system and generics', sampleAgents);

      // TypeScript expert should be first with multiple matches
      expect(result[0]!.agent.name).toBe('typescript-expert');
      expect(result[0]!.score).toBeGreaterThan(1);
    });

    it('should include match reason in result', () => {
      const result = suggestAgents('help with testing', sampleAgents);

      expect(result[0]!.matchedKeywords).toContain('testing');
    });
  });

  describe('T069: suggestAgents - gracefully skips if no agents', () => {
    it('should return empty array when agents list is empty', () => {
      const result = suggestAgents('help with TypeScript', []);

      expect(result).toEqual([]);
    });

    it('should return empty array when agents is undefined', () => {
      const result = suggestAgents('help', undefined as unknown as AgentDefinition[]);

      expect(result).toEqual([]);
    });

    it('should return empty array when agents is null', () => {
      const result = suggestAgents('help', null as unknown as AgentDefinition[]);

      expect(result).toEqual([]);
    });

    it('should handle agents with missing fields', () => {
      const partialAgents = [
        { name: 'partial', description: '', keywords: [], filePath: '' },
      ] as AgentDefinition[];

      const result = suggestAgents('help with partial', partialAgents);

      // Should not crash, may or may not match
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('formatAgentsContext', () => {
    it('should format suggested agents as readable string', () => {
      const suggestions: SuggestedAgent[] = [
        {
          agent: {
            name: 'typescript-expert',
            description: 'TypeScript expert agent',
            keywords: ['typescript'],
            filePath: '.claude/agents/typescript-expert.md',
          },
          score: 2,
          matchedKeywords: ['typescript'],
        },
      ];

      const result = formatAgentsContext(suggestions);

      expect(result).toContain('typescript-expert');
      expect(result).toContain('TypeScript expert');
    });

    it('should return empty string for no suggestions', () => {
      const result = formatAgentsContext([]);

      expect(result).toBe('');
    });

    it('should list multiple agents', () => {
      const suggestions: SuggestedAgent[] = [
        {
          agent: { name: 'agent-a', description: 'Agent A', keywords: [], filePath: '' },
          score: 2,
          matchedKeywords: ['a'],
        },
        {
          agent: { name: 'agent-b', description: 'Agent B', keywords: [], filePath: '' },
          score: 1,
          matchedKeywords: ['b'],
        },
      ];

      const result = formatAgentsContext(suggestions);

      expect(result).toContain('agent-a');
      expect(result).toContain('agent-b');
    });
  });
});

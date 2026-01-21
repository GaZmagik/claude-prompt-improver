/**
 * Tests for dynamic-discovery integration
 * TDD: Write tests first for agent discovery, then implement
 */
import { describe, expect, it } from 'bun:test';
import {
  parseResourceMetadata,
  discoverAgents,
  matchAgentsToPrompt,
  formatAgentSuggestions,
  gatherDynamicContext,
  formatDynamicContext,
  type DiscoveredItem,
  type DynamicDiscoveryOptions,
  type DynamicContext,
  MAX_SUGGESTIONS,
} from './dynamic-discovery.ts';

describe('parseResourceMetadata', () => {
  describe('agent metadata parsing', () => {
    it('should extract name from frontmatter', () => {
      const content = `---
name: typescript-expert
description: TypeScript specialist
---
# Agent content`;
      const result = parseResourceMetadata(content, '/path/to/agent.md', 'agent', 'global');

      expect(result.name).toBe('typescript-expert');
    });

    it('should extract description from frontmatter', () => {
      const content = `---
name: rust-expert
description: Use for complex Rust tasks including async/await and unsafe code
---
# Agent content`;
      const result = parseResourceMetadata(content, '/path/to/agent.md', 'agent', 'global');

      expect(result.description).toBe(
        'Use for complex Rust tasks including async/await and unsafe code'
      );
    });

    it('should extract explicit keywords from frontmatter', () => {
      const content = `---
name: test-agent
description: Testing agent
keywords:
  - testing
  - unit-tests
  - tdd
---
# Agent`;
      const result = parseResourceMetadata(content, '/path/to/agent.md', 'agent', 'global');

      expect(result.keywords).toContain('testing');
      expect(result.keywords).toContain('unit-tests');
      expect(result.keywords).toContain('tdd');
    });

    it('should fall back to extracting keywords from description when no explicit keywords', () => {
      const content = `---
name: python-expert
description: Use for async/await patterns, performance optimisation, and API design
---
# Agent`;
      const result = parseResourceMetadata(content, '/path/to/agent.md', 'agent', 'global');

      expect(result.keywords).toContain('async');
      expect(result.keywords).toContain('await');
      expect(result.keywords).toContain('performance');
      expect(result.keywords).toContain('api');
    });

    it('should fall back to filename when frontmatter missing', () => {
      const content = `# Just markdown content without frontmatter`;
      const result = parseResourceMetadata(
        content,
        '/path/to/security-expert.md',
        'agent',
        'global'
      );

      expect(result.name).toBe('security-expert');
    });

    it('should handle malformed YAML gracefully (return with filename fallback)', () => {
      const content = `---
name: [invalid yaml
description: also broken: : :
---
# Content`;
      const result = parseResourceMetadata(
        content,
        '/path/to/fallback-agent.md',
        'agent',
        'global'
      );

      // Should not throw, should use filename
      expect(result.name).toBe('fallback-agent');
    });
  });
});

describe('discoverAgents', () => {
  it('should scan global directory ~/.claude/agents/', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/expert.md': `---
name: global-expert
description: A global agent
---`,
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    expect(result.some((a) => a.name === 'global-expert')).toBe(true);
    expect(result.some((a) => a.source === 'global')).toBe(true);
  });

  it('should scan local directory .claude/agents/', async () => {
    const mockFs = {
      '.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'local.md', isFile: true, isDirectory: false }],
      },
      '.claude/agents/local.md': `---
name: local-agent
description: A local agent
---`,
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    expect(result.some((a) => a.name === 'local-agent')).toBe(true);
    expect(result.some((a) => a.source === 'local')).toBe(true);
  });

  it('should scan both global and local directories', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'global.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/global.md': `---
name: global-agent
description: Global
---`,
      '.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'local.md', isFile: true, isDirectory: false }],
      },
      '.claude/agents/local.md': `---
name: local-agent
description: Local
---`,
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    expect(result.length).toBe(2);
    expect(result.some((a) => a.name === 'global-agent')).toBe(true);
    expect(result.some((a) => a.name === 'local-agent')).toBe(true);
  });

  it('should give local precedence over global (same filename)', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/expert.md': `---
name: expert
description: Global version
---`,
      '.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
      },
      '.claude/agents/expert.md': `---
name: expert
description: Local version
---`,
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    // Should only have one "expert" (local wins)
    const experts = result.filter((a) => a.name === 'expert');
    expect(experts.length).toBe(1);
    expect(experts[0]!.description).toBe('Local version');
    expect(experts[0]!.source).toBe('local');
  });

  it('should deduplicate by normalised name (case-insensitive)', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'TypeScript-Expert.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/TypeScript-Expert.md': `---
name: TypeScript-Expert
description: Global TS
---`,
      '.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'typescript-expert.md', isFile: true, isDirectory: false }],
      },
      '.claude/agents/typescript-expert.md': `---
name: typescript-expert
description: Local TS
---`,
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    // Should dedupe (local wins)
    expect(result.length).toBe(1);
    expect(result[0]!.source).toBe('local');
  });

  it('should handle missing global directory gracefully', async () => {
    const mockFs = {
      '.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'local.md', isFile: true, isDirectory: false }],
      },
      '.claude/agents/local.md': `---
name: local-agent
description: Only local
---`,
      // No global directory
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('local-agent');
  });

  it('should handle missing local directory gracefully', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'global.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/global.md': `---
name: global-agent
description: Only global
---`,
      // No local directory
    };

    const result = await discoverAgents({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('global-agent');
  });
});

describe('matchAgentsToPrompt', () => {
  const testAgents: DiscoveredItem[] = [
    {
      name: 'typescript-expert',
      description: 'TypeScript specialist',
      keywords: ['typescript', 'types', 'generics'],
      filePath: '/path/ts.md',
      resourceType: 'agent',
      source: 'global',
    },
    {
      name: 'rust-expert',
      description: 'Rust specialist',
      keywords: ['rust', 'async', 'unsafe'],
      filePath: '/path/rust.md',
      resourceType: 'agent',
      source: 'global',
    },
    {
      name: 'python-expert',
      description: 'Python specialist',
      keywords: ['python', 'async', 'django'],
      filePath: '/path/py.md',
      resourceType: 'agent',
      source: 'global',
    },
  ];

  it('should use matchItemsByKeywords() for matching', () => {
    const prompt = 'Help me with TypeScript generics';
    const result = matchAgentsToPrompt(testAgents, prompt);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.item.name).toBe('typescript-expert');
  });

  it('should return sorted by score (highest relevance first)', () => {
    const prompt = 'I need help with async Rust code';
    const result = matchAgentsToPrompt(testAgents, prompt);

    // rust-expert matches 'rust' and 'async', should be first
    expect(result[0]!.item.name).toBe('rust-expert');
    expect(result[0]!.score).toBeGreaterThanOrEqual(2);
  });

  it('should limit to top 5 matches (MAX_SUGGESTIONS=5)', () => {
    const manyAgents: DiscoveredItem[] = [];
    for (let i = 0; i < 10; i++) {
      manyAgents.push({
        name: `agent-${i}`,
        description: `Agent number ${i}`,
        keywords: ['test', 'agent'],
        filePath: `/path/agent-${i}.md`,
        resourceType: 'agent',
        source: 'global',
      });
    }

    const result = matchAgentsToPrompt(manyAgents, 'test agent help');

    expect(result.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    expect(MAX_SUGGESTIONS).toBe(5);
  });
});

describe('formatAgentSuggestions', () => {
  const testAgents: DiscoveredItem[] = [
    {
      name: 'typescript-expert',
      description: 'Use for TypeScript tasks',
      keywords: ['typescript'],
      filePath: '/path/ts.md',
      resourceType: 'agent',
      source: 'global',
    },
  ];

  it('should use "- Agent: {name} - {description}" format', () => {
    const formatted = formatAgentSuggestions(testAgents, 1);

    expect(formatted).toContain('typescript-expert');
    expect(formatted).toContain('Use for TypeScript tasks');
  });

  it('should note "and N more available" when total > displayed', () => {
    const formatted = formatAgentSuggestions(testAgents, 10); // 10 total but only 1 displayed

    expect(formatted).toContain('and 9 more available');
  });
});

describe('gatherDynamicContext', () => {
  it('should export DynamicDiscoveryOptions interface', () => {
    const options: DynamicDiscoveryOptions = {
      enabled: true,
    };
    expect(options.enabled).toBe(true);
  });

  it('should support _mockFileSystem option', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'test.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/test.md': `---
name: test-agent
description: Test
---`,
    };

    const result = await gatherDynamicContext({
      prompt: 'test',
      _mockFileSystem: mockFs,
    });

    expect(result.success).toBe(true);
  });

  it('should return DynamicDiscoveryResult with success/error/skipped', async () => {
    const result = await gatherDynamicContext({
      prompt: 'test',
      _mockFileSystem: {},
    });

    expect('success' in result).toBe(true);
    expect('skipped' in result || 'error' in result || result.success).toBe(true);
  });

  it('should return skipped=true when enabled=false', async () => {
    const result = await gatherDynamicContext({
      prompt: 'test',
      enabled: false,
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
  });

  it('should return skipReason="disabled" when enabled=false', async () => {
    const result = await gatherDynamicContext({
      prompt: 'test',
      enabled: false,
    });

    expect(result.skipReason).toBe('disabled');
  });
});

describe('formatDynamicContext', () => {
  it('should format matched agents for injection', () => {
    const context: DynamicContext = {
      matchedAgents: [
        {
          item: {
            name: 'typescript-expert',
            description: 'TS specialist',
            keywords: ['typescript'],
            filePath: '/path/ts.md',
            resourceType: 'agent',
            source: 'global',
          },
          matchedKeywords: ['typescript'],
          score: 1,
        },
      ],
      matchedCommands: [],
      matchedSkills: [],
      matchedOutputStyles: [],
      isMemoryThinkContext: false,
      totalAgents: 1,
      totalCommands: 0,
      totalSkills: 0,
      totalOutputStyles: 0,
    };

    const formatted = formatDynamicContext(context);

    expect(formatted).toContain('typescript-expert');
    expect(formatted).toContain('TS specialist');
  });

  it('should return empty string when no matches', () => {
    const context: DynamicContext = {
      matchedAgents: [],
      matchedCommands: [],
      matchedSkills: [],
      matchedOutputStyles: [],
      isMemoryThinkContext: false,
      totalAgents: 0,
      totalCommands: 0,
      totalSkills: 0,
      totalOutputStyles: 0,
    };

    const formatted = formatDynamicContext(context);

    expect(formatted).toBe('');
  });
});

describe('discoverCommands', () => {
  it('should scan global and local command directories', async () => {
    const { discoverCommands } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/commands/': {
        type: 'directory' as const,
        entries: [{ name: 'review.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/commands/review.md': `---
description: Code review command
---`,
      '.claude/commands/': {
        type: 'directory' as const,
        entries: [{ name: 'test.md', isFile: true, isDirectory: false }],
      },
      '.claude/commands/test.md': `---
description: Run tests
---`,
    };

    const result = await discoverCommands({ _mockFileSystem: mockFs });

    expect(result.length).toBe(2);
    expect(result.some((c) => c.name === 'review')).toBe(true);
    expect(result.some((c) => c.name === 'test')).toBe(true);
  });

  it('should give local commands precedence', async () => {
    const { discoverCommands } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/commands/': {
        type: 'directory' as const,
        entries: [{ name: 'deploy.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/commands/deploy.md': `---
description: Global deploy
---`,
      '.claude/commands/': {
        type: 'directory' as const,
        entries: [{ name: 'deploy.md', isFile: true, isDirectory: false }],
      },
      '.claude/commands/deploy.md': `---
description: Local deploy
---`,
    };

    const result = await discoverCommands({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.description).toBe('Local deploy');
  });
});

describe('discoverOutputStyles', () => {
  it('should scan global and local output-styles directories', async () => {
    const { discoverOutputStyles } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/output-styles/': {
        type: 'directory' as const,
        entries: [{ name: 'Sardonic.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/output-styles/Sardonic.md': `---
name: Sardonic
description: Dry humor and sarcasm
---`,
    };

    const result = await discoverOutputStyles({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('Sardonic');
    expect(result[0]!.description).toBe('Dry humor and sarcasm');
  });
});

describe('gatherDynamicContext with multiple sources', () => {
  it('should discover agents, commands, and output styles in parallel', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/expert.md': `---
name: test-expert
description: Test expert
---`,
      '~/.claude/commands/': {
        type: 'directory' as const,
        entries: [{ name: 'build.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/commands/build.md': `---
description: Build command
---`,
      '~/.claude/output-styles/': {
        type: 'directory' as const,
        entries: [{ name: 'Formal.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/output-styles/Formal.md': `---
name: Formal
description: Professional tone
---`,
    };

    const result = await gatherDynamicContext({
      prompt: 'test build',
      _mockFileSystem: mockFs,
    });

    expect(result.success).toBe(true);
    expect(result.context!.totalAgents).toBeGreaterThanOrEqual(1);
    expect(result.context!.totalCommands).toBeGreaterThanOrEqual(1);
    expect(result.context!.totalOutputStyles).toBeGreaterThanOrEqual(1);
  });
});

describe('discoverSkills', () => {
  it('should scan global and local skills directories for SKILL.md files', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [
          { name: 'handover', isFile: false, isDirectory: true },
          { name: 'speckit', isFile: false, isDirectory: true },
        ],
      },
      '~/.claude/skills/handover/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/handover/SKILL.md': `---
name: handover
description: Session continuity and handover management
---`,
      '~/.claude/skills/speckit/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/speckit/SKILL.md': `---
name: speckit
description: Specification-driven development workflow
---`,
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result.length).toBe(2);
    expect(result.some((s) => s.name === 'handover')).toBe(true);
    expect(result.some((s) => s.name === 'speckit')).toBe(true);
  });

  it('should use directory name as fallback when SKILL.md has no name', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [{ name: 'my-skill', isFile: false, isDirectory: true }],
      },
      '~/.claude/skills/my-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/my-skill/SKILL.md': `---
description: A skill without explicit name
---`,
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('my-skill');
  });

  it('should skip directories without SKILL.md', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [
          { name: 'valid-skill', isFile: false, isDirectory: true },
          { name: 'empty-dir', isFile: false, isDirectory: true },
        ],
      },
      '~/.claude/skills/valid-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/valid-skill/SKILL.md': `---
name: valid-skill
description: Has SKILL.md
---`,
      '~/.claude/skills/empty-dir/': {
        type: 'directory' as const,
        entries: [{ name: 'README.md', isFile: true, isDirectory: false }],
      },
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('valid-skill');
  });

  it('should give local skills precedence over global', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [{ name: 'shared-skill', isFile: false, isDirectory: true }],
      },
      '~/.claude/skills/shared-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/shared-skill/SKILL.md': `---
name: shared-skill
description: Global version
---`,
      '.claude/skills/': {
        type: 'directory' as const,
        entries: [{ name: 'shared-skill', isFile: false, isDirectory: true }],
      },
      '.claude/skills/shared-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '.claude/skills/shared-skill/SKILL.md': `---
name: shared-skill
description: Local version
---`,
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.description).toBe('Local version');
    expect(result[0]!.source).toBe('local');
  });

  it('should set resourceType to skill', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [{ name: 'test-skill', isFile: false, isDirectory: true }],
      },
      '~/.claude/skills/test-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/test-skill/SKILL.md': `---
name: test-skill
description: Test
---`,
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result[0]!.resourceType).toBe('skill');
  });

  it('should skip .disabled directories', async () => {
    const { discoverSkills } = await import('./dynamic-discovery.ts');
    const mockFs = {
      '~/.claude/skills/': {
        type: 'directory' as const,
        entries: [
          { name: 'active-skill', isFile: false, isDirectory: true },
          { name: 'chronicle.disabled', isFile: false, isDirectory: true },
        ],
      },
      '~/.claude/skills/active-skill/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/active-skill/SKILL.md': `---
name: active-skill
description: Active
---`,
      '~/.claude/skills/chronicle.disabled/': {
        type: 'directory' as const,
        entries: [{ name: 'SKILL.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/skills/chronicle.disabled/SKILL.md': `---
name: chronicle
description: Disabled skill
---`,
    };

    const result = await discoverSkills({ _mockFileSystem: mockFs });

    expect(result.length).toBe(1);
    expect(result[0]!.name).toBe('active-skill');
  });
});

describe('isMemoryThinkPrompt', () => {
  it('should detect "memory think create" pattern', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('memory think create "API design"')).toBe(true);
  });

  it('should detect "memory think add" pattern', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('memory think add "consideration"')).toBe(true);
  });

  it('should detect "memory think counter" pattern', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('memory think counter "argument"')).toBe(true);
  });

  it('should detect "memory think branch" pattern', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('memory think branch "alternative"')).toBe(true);
  });

  it('should detect "memory think conclude" pattern', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('memory think conclude "decision"')).toBe(true);
  });

  it('should return false for non-memory-think prompts', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('help me with typescript')).toBe(false);
  });

  it('should be case-insensitive', async () => {
    const { isMemoryThinkPrompt } = await import('./dynamic-discovery.ts');
    expect(isMemoryThinkPrompt('Memory Think Create "topic"')).toBe(true);
  });
});

describe('gatherDynamicContext with memory think', () => {
  it('should set isMemoryThinkContext=true for memory think prompts', async () => {
    const mockFs = {
      '~/.claude/agents/': {
        type: 'directory' as const,
        entries: [{ name: 'expert.md', isFile: true, isDirectory: false }],
      },
      '~/.claude/agents/expert.md': `---
name: api-expert
description: API design specialist
---`,
    };

    const result = await gatherDynamicContext({
      prompt: 'memory think create "API design decisions"',
      _mockFileSystem: mockFs,
    });

    expect(result.success).toBe(true);
    expect(result.context!.isMemoryThinkContext).toBe(true);
  });

  it('should set isMemoryThinkContext=false for regular prompts', async () => {
    const result = await gatherDynamicContext({
      prompt: 'help me with typescript',
      _mockFileSystem: {},
    });

    expect(result.success).toBe(true);
    expect(result.context!.isMemoryThinkContext).toBe(false);
  });
});

describe('formatDynamicContext with memory think', () => {
  it('should format memory think context with special guidance', () => {
    const context: DynamicContext = {
      matchedAgents: [
        {
          item: {
            name: 'api-expert',
            description: 'API design specialist',
            keywords: ['api', 'design'],
            filePath: '/path/api.md',
            resourceType: 'agent',
            source: 'global',
          },
          matchedKeywords: ['api'],
          score: 1,
        },
      ],
      matchedCommands: [],
      matchedSkills: [],
      matchedOutputStyles: [
        {
          item: {
            name: 'socratic',
            description: 'Question-driven exploration',
            keywords: ['questions', 'exploration'],
            filePath: '/path/socratic.md',
            resourceType: 'outputStyle',
            source: 'global',
          },
          matchedKeywords: [],
          score: 0.5,
        },
      ],
      isMemoryThinkContext: true,
      totalAgents: 1,
      totalCommands: 0,
      totalSkills: 0,
      totalOutputStyles: 1,
    };

    const formatted = formatDynamicContext(context);

    expect(formatted).toContain('--agent');
    expect(formatted).toContain('--style');
    expect(formatted).toContain('api-expert');
  });
});

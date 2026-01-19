/**
 * T017: Test TypeScript types compile
 * Verifies that all type definitions are valid and usable
 */
import { describe, expect, it } from 'bun:test';
import type {
  BypassDecision,
  BypassReason,
  Classification,
  ClaudeModel,
  Configuration,
  Context,
  ContextSource,
  HookInput,
  HookOutput,
  ImprovedPrompt,
  LogEntry,
  Prompt,
  XmlTag,
} from './types.ts';

describe('Core Types', () => {
  describe('ClaudeModel', () => {
    it('should accept valid model names', () => {
      const haiku: ClaudeModel = 'haiku';
      const sonnet: ClaudeModel = 'sonnet';
      const opus: ClaudeModel = 'opus';

      expect(haiku).toBe('haiku');
      expect(sonnet).toBe('sonnet');
      expect(opus).toBe('opus');
    });
  });

  describe('ContextSource', () => {
    it('should accept all valid context sources', () => {
      const sources: ContextSource[] = [
        'tools',
        'skills',
        'agents',
        'git',
        'lsp',
        'spec',
        'memory',
        'session',
      ];

      expect(sources).toHaveLength(8);
    });
  });

  describe('BypassReason', () => {
    it('should accept all valid bypass reasons', () => {
      const reasons: BypassReason[] = [
        'short_prompt',
        'skip_tag',
        'low_context',
        'forked_session',
        'plugin_disabled',
        'classification_failed',
        'improvement_failed',
      ];

      expect(reasons).toHaveLength(7);
    });
  });

  describe('XmlTag', () => {
    it('should accept all valid XML tags', () => {
      const tags: XmlTag[] = ['task', 'context', 'constraints', 'output_format', 'examples'];

      expect(tags).toHaveLength(5);
    });
  });

  describe('Prompt', () => {
    it('should create a valid Prompt object', () => {
      const prompt: Prompt = {
        originalText: 'fix the bug',
        tokenCount: 3,
        submittedAt: new Date('2026-01-18T22:00:00Z'),
        conversationId: 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
        messageIndex: 42,
      };

      expect(prompt.originalText).toBe('fix the bug');
      expect(prompt.tokenCount).toBe(3);
      expect(prompt.conversationId).toBe('a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p');
      expect(prompt.messageIndex).toBe(42);
    });
  });

  describe('ImprovedPrompt', () => {
    it('should create a valid ImprovedPrompt object', () => {
      const improved: ImprovedPrompt = {
        improvedText: '<task>Fix the authentication bug</task>',
        originalPromptId: 'prompt-123',
        appliedTags: ['task', 'context'],
        injectedContext: ['git', 'lsp'],
        modelUsed: 'sonnet',
        improvementLatency: 4200,
        preservedIntent: true,
        createdAt: new Date('2026-01-18T22:00:04Z'),
      };

      expect(improved.improvedText).toContain('<task>');
      expect(improved.appliedTags).toContain('task');
      expect(improved.modelUsed).toBe('sonnet');
      expect(improved.preservedIntent).toBe(true);
    });
  });

  describe('Classification', () => {
    it('should create a valid Classification object', () => {
      const classification: Classification = {
        level: 'COMPLEX',
        reasoning: 'Prompt is vague without specifying which bug',
        confidence: 0.92,
        modelUsed: 'haiku',
        classificationLatency: 1200,
        promptId: 'prompt-123',
        classifiedAt: new Date('2026-01-18T22:00:01Z'),
      };

      expect(classification.level).toBe('COMPLEX');
      expect(classification.modelUsed).toBe('haiku');
      expect(classification.confidence).toBe(0.92);
    });

    it('should allow Classification without confidence', () => {
      const classification: Classification = {
        level: 'NONE',
        reasoning: 'Well-structured prompt',
        modelUsed: 'haiku',
        classificationLatency: 800,
        promptId: 'prompt-456',
        classifiedAt: new Date(),
      };

      expect(classification.confidence).toBeUndefined();
    });
  });

  describe('Context', () => {
    it('should create a valid Context object', () => {
      const context: Context = {
        source: 'git',
        content: 'Branch: feature/auth-refactor',
        relevanceScore: 0.85,
        gatheredAt: new Date(),
        gatheringLatency: 340,
        promptId: 'prompt-123',
      };

      expect(context.source).toBe('git');
      expect(context.relevanceScore).toBe(0.85);
    });
  });

  describe('Configuration', () => {
    it('should create a valid Configuration object with all fields', () => {
      const config: Configuration = {
        enabled: true,
        forceImprove: false,
        shortPromptThreshold: 10,
        compactionThreshold: 5,
        defaultSimpleModel: 'haiku',
        defaultComplexModel: 'sonnet',
        improverModel: 'haiku',
        integrations: {
          git: true,
          lsp: true,
          spec: true,
          memory: true,
          session: false,
        },
        logging: {
          enabled: true,
          logFilePath: '.claude/logs/prompt-improver-latest.log',
          logLevel: 'INFO',
          maxLogSizeMB: 10,
          maxLogAgeDays: 7,
          displayImprovedPrompt: true,
          useTimestampedLogs: false,
        },
      };

      expect(config.enabled).toBe(true);
      expect(config.shortPromptThreshold).toBe(10);
      expect(config.integrations.session).toBe(false);
      expect(config.logging.displayImprovedPrompt).toBe(true);
    });
  });

  describe('BypassDecision', () => {
    it('should create a valid BypassDecision object', () => {
      const bypass: BypassDecision = {
        reason: 'short_prompt',
        promptId: 'prompt-456',
        detectedAt: new Date(),
        detectionLatency: 2,
      };

      expect(bypass.reason).toBe('short_prompt');
      expect(bypass.detectionLatency).toBe(2);
    });
  });

  describe('LogEntry', () => {
    it('should create a valid LogEntry for improved prompt', () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        phase: 'complete',
        promptPreview: 'fix the bug...',
        improvedPrompt: '<task>Fix the bug...</task>',
        bypassReason: null,
        modelUsed: 'sonnet',
        totalLatency: 4532,
        contextSources: ['git', 'lsp'],
        conversationId: 'conv-123',
      };

      expect(entry.improvedPrompt).not.toBeNull();
      expect(entry.bypassReason).toBeNull();
      expect(entry.modelUsed).toBe('sonnet');
    });

    it('should create a valid LogEntry for bypassed prompt', () => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        phase: 'bypass',
        promptPreview: 'yes...',
        improvedPrompt: null,
        bypassReason: 'short_prompt',
        modelUsed: null,
        totalLatency: 2,
        contextSources: [],
        conversationId: 'conv-123',
      };

      expect(entry.improvedPrompt).toBeNull();
      expect(entry.bypassReason).toBe('short_prompt');
      expect(entry.modelUsed).toBeNull();
    });
  });

  describe('HookInput', () => {
    it('should create a valid HookInput object', () => {
      const input: HookInput = {
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
      };

      expect(input.prompt).toBe('fix the bug');
      expect(input.context.conversation_id).toBe('conv-123');
      expect(input.context.available_tools).toContain('Read');
    });

    it('should handle forked session detection', () => {
      const input: HookInput = {
        prompt: 'internal prompt',
        context: {
          conversation_id: 'conv-123',
          message_index: 1,
          permission_mode: 'fork',
        },
      };

      expect(input.context.permission_mode).toBe('fork');
    });
  });

  describe('HookOutput', () => {
    it('should create a valid HookOutput for passthrough', () => {
      const output: HookOutput = {
        continue: true,
      };

      expect(output.continue).toBe(true);
    });

    it('should create a valid HookOutput with additional context', () => {
      const output: HookOutput = {
        continue: true,
        systemMessage: '🎯 Prompt improved',
        additionalContext: '<improved_prompt>...</improved_prompt>',
      };

      expect(output.systemMessage).toBe('🎯 Prompt improved');
      expect(output.additionalContext).toContain('<improved_prompt>');
    });
  });
});

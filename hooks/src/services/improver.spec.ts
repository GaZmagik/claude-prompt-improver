/**
 * T036-T040: Improver tests
 * T036: Test improver uses Haiku for SIMPLE classification
 * T037: Test improver uses Sonnet for COMPLEX classification
 * T038: Test improver preserves original intent and tone
 * T039: Test improver injects context from context builder
 * T040: Test improver fallback to original on timeout
 */
import { describe, expect, it } from 'bun:test';
import {
  improvePrompt,
  buildImprovementPrompt,
  getModelForClassification,
  getTimeoutForClassification,
} from './improver.ts';

describe('Improver', () => {
  describe('T036: getModelForClassification - uses Haiku for SIMPLE', () => {
    it('should return haiku for SIMPLE classification', () => {
      const model = getModelForClassification('SIMPLE');
      expect(model).toBe('haiku');
    });

    it('should return haiku timeout (30s) for SIMPLE', () => {
      const timeout = getTimeoutForClassification('SIMPLE');
      expect(timeout).toBe(30_000);
    });
  });

  describe('T037: getModelForClassification - uses Sonnet for COMPLEX', () => {
    it('should return sonnet for COMPLEX classification', () => {
      const model = getModelForClassification('COMPLEX');
      expect(model).toBe('sonnet');
    });

    it('should return sonnet timeout (60s) for COMPLEX', () => {
      const timeout = getTimeoutForClassification('COMPLEX');
      expect(timeout).toBe(60_000);
    });
  });

  describe('T038: buildImprovementPrompt - preserves original intent and tone', () => {
    it('should include instruction to preserve intent', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the bug',
        classification: 'COMPLEX',
      });

      expect(prompt.toLowerCase()).toContain('intent');
    });

    it('should include instruction to preserve tone', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'help me please',
        classification: 'SIMPLE',
      });

      expect(prompt.toLowerCase()).toContain('tone');
    });

    it('should include the original prompt', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'make it faster',
        classification: 'COMPLEX',
      });

      expect(prompt).toContain('make it faster');
    });

    it('should include classification level for context', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test',
        classification: 'COMPLEX',
      });

      expect(prompt).toContain('COMPLEX');
    });
  });

  describe('T039: buildImprovementPrompt - injects context', () => {
    it('should include git context when provided', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the bug',
        classification: 'COMPLEX',
        context: {
          git: 'Branch: feature/auth\nRecent commit: Add JWT validation',
        },
      });

      expect(prompt).toContain('feature/auth');
      expect(prompt).toContain('JWT validation');
    });

    it('should include LSP context when provided', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the error',
        classification: 'COMPLEX',
        context: {
          lsp: 'Error: Property "foo" does not exist on type "Bar"',
        },
      });

      // Quotes are escaped to prevent XML/prompt injection
      expect(prompt).toContain('Property &quot;foo&quot;');
    });

    it('should include multiple context sources', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'help',
        classification: 'COMPLEX',
        context: {
          git: 'Branch: main',
          tools: 'Available: Read, Write, Edit',
          skills: 'memory, typescript-expert',
        },
      });

      expect(prompt).toContain('Branch: main');
      expect(prompt).toContain('Read, Write, Edit');
      expect(prompt).toContain('typescript-expert');
    });

    it('should handle empty context gracefully', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test',
        classification: 'SIMPLE',
        context: {},
      });

      expect(prompt).toContain('test');
    });
  });

  describe('T040: improvePrompt - fallback to original on timeout', () => {
    it('should return original prompt on timeout/error', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        classification: 'COMPLEX',
        sessionId: 'session-123',
        _mockClaudeResponse: null, // Simulates timeout
      });

      expect(result.success).toBe(false);
      expect(result.improvedPrompt).toBe('fix the bug');
      expect(result.fallbackToOriginal).toBe(true);
    });

    it('should return improved prompt on success', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        classification: 'COMPLEX',
        sessionId: 'session-123',
        _mockClaudeResponse: '<task>Investigate and fix the authentication bug</task>',
      });

      expect(result.success).toBe(true);
      expect(result.improvedPrompt).toContain('authentication bug');
      expect(result.fallbackToOriginal).toBe(false);
    });

    it('should include latency in result', async () => {
      const result = await improvePrompt({
        originalPrompt: 'test',
        classification: 'SIMPLE',
        sessionId: 'session-123',
        _mockClaudeResponse: 'Improved: test with more detail',
      });

      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should use correct model based on classification', async () => {
      const simpleResult = await improvePrompt({
        originalPrompt: 'help',
        classification: 'SIMPLE',
        sessionId: 'session-123',
        _mockClaudeResponse: 'Improved help prompt',
      });

      const complexResult = await improvePrompt({
        originalPrompt: 'fix',
        classification: 'COMPLEX',
        sessionId: 'session-456',
        _mockClaudeResponse: 'Improved complex prompt',
      });

      expect(simpleResult.modelUsed).toBe('haiku');
      expect(complexResult.modelUsed).toBe('sonnet');
    });
  });

  describe('improvePrompt with context', () => {
    it('should pass context to improvement prompt', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        classification: 'COMPLEX',
        sessionId: 'session-123',
        context: {
          git: 'Branch: feature/auth',
        },
        _mockClaudeResponse: '<task>Fix auth bug on feature/auth branch</task>',
      });

      expect(result.success).toBe(true);
      expect(result.contextSources).toContain('git');
    });

    it('should track which context sources were used', async () => {
      const result = await improvePrompt({
        originalPrompt: 'help',
        classification: 'COMPLEX',
        sessionId: 'session-123',
        context: {
          git: 'Branch info',
          lsp: 'Error info',
          tools: 'Tool info',
        },
        _mockClaudeResponse: 'Improved prompt',
      });

      expect(result.contextSources).toContain('git');
      expect(result.contextSources).toContain('lsp');
      expect(result.contextSources).toContain('tools');
    });
  });
});

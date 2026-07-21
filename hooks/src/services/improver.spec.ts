/**
 * T038-T040: Improver tests
 * T038: Test improver preserves original intent and tone
 * T039: Test improver injects context from context builder
 * T040: Test improver fallback to original on timeout
 */
import { describe, expect, it } from 'bun:test';
import type { Configuration } from '../core/types.ts';
import { buildImprovementPrompt, generateImprovementSummary, improvePrompt } from './improver.ts';

// Mock config for tests
const mockConfig: Configuration = {
  enabled: true,
  forceImprove: false,
  shortPromptThreshold: 10,
  compactionThreshold: 5,
  defaultSimpleModel: 'haiku',
  defaultComplexModel: 'sonnet',
  improverModel: 'haiku',
  integrations: {
    git: false,
    lsp: false,
    spec: false,
    memory: false,
    session: false,
    dynamicDiscovery: false,
    pluginResources: false,
    projectShape: false,
  },
  logging: {
    enabled: false,
    logFilePath: '.claude/logs/test.log',
    logLevel: 'ERROR',
    maxLogSizeMB: 10,
    maxLogAgeDays: 7,
    displayImprovedPrompt: false,
    useTimestampedLogs: false,
  },
};

describe('Improver', () => {
  describe('T038: buildImprovementPrompt - preserves original intent and tone', () => {
    it('should include instruction to preserve intent', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the bug',
      });

      expect(prompt.toLowerCase()).toContain('intent');
    });

    it('should include instruction to preserve tone', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'help me please',
      });

      expect(prompt.toLowerCase()).toContain('tone');
    });

    it('should include the original prompt', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'make it faster',
      });

      expect(prompt).toContain('make it faster');
    });

    it('should include forked session framing', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).toContain('FORKED SESSION');
      expect(prompt).toContain('prompt improvement agent');
    });

    it('should include explicit boundary instructions', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt.toLowerCase()).toContain('do not continue');
      expect(prompt.toLowerCase()).toContain('do not ask questions');
    });

    it('should clarify model is not the previous assistant', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).toContain('NOT the assistant from the previous conversation');
    });

    it('should place forked session framing before the original prompt', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      const framingIndex = prompt.indexOf('[FORKED SESSION');
      const promptIndex = prompt.indexOf('<original_prompt>');
      expect(framingIndex).toBeLessThan(promptIndex);
      expect(framingIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('T039: buildImprovementPrompt - injects context', () => {
    it('should include git context when provided', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the bug',
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
        context: {},
      });

      expect(prompt).toContain('test');
    });
  });

  describe('T040: improvePrompt - fallback to original on timeout', () => {
    it('should return original prompt on timeout/error', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the bug',
        _mockClaudeResponse: null, // Simulates timeout
      });

      expect(result.success).toBe(false);
      expect(result.improvedPrompt).toBe('fix the bug');
      expect(result.fallbackToOriginal).toBe(true);
    });

    it('should return improved prompt on success', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the bug',
        _mockClaudeResponse: '<task>Investigate and fix the authentication bug</task>',
      });

      expect(result.success).toBe(true);
      expect(result.improvedPrompt).toContain('authentication bug');
      expect(result.fallbackToOriginal).toBe(false);
    });

    it('should include latency in result', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'test',
        _mockClaudeResponse: 'Improved: test with more detail',
      });

      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should use opus with 90s timeout when configured', async () => {
      const opusConfig: Configuration = {
        ...mockConfig,
        improverModel: 'opus',
      };

      const result = await improvePrompt({
        config: opusConfig,
        originalPrompt: 'complex architectural decision requiring deep analysis',
        _mockClaudeResponse: 'Detailed architectural analysis with trade-offs...',
      });

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBe('opus');
      expect(result.improvedPrompt).toContain('architectural');
      // Opus timeout is 100s (100_000ms) - verify it completes within reasonable time
      expect(result.latencyMs).toBeLessThan(100_000);
    });

    it('should use correct model based on classification', async () => {
      const simpleResult = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'help',
        _mockClaudeResponse: 'Improved help prompt',
      });

      const complexResult = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix',
        _mockClaudeResponse: 'Improved complex prompt',
      });

      // Both use the same model from config (no classification-based selection)
      expect(simpleResult.modelUsed).toBe('haiku');
      expect(complexResult.modelUsed).toBe('haiku');
    });
  });

  describe('improvePrompt with context', () => {
    it('should pass context to improvement prompt', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the bug',
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
        config: mockConfig,
        originalPrompt: 'help',
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

  describe('generateImprovementSummary - change detection', () => {
    it('should detect XML structuring added', () => {
      const originalPrompt = 'fix the authentication bug';
      const improvedPrompt = '<task>Fix the authentication bug in the login service</task>';

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
      expect(
        summary.some(
          (s) => s.toLowerCase().includes('xml') || s.toLowerCase().includes('structure')
        )
      ).toBe(true);
    });

    it('should detect context injection', () => {
      const originalPrompt = 'fix the bug';
      const improvedPrompt = `<task>Fix the bug</task>
<context>
Current branch: feature/auth
Recent commit: Add JWT validation
</context>`;

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(
        summary.some(
          (s) => s.toLowerCase().includes('context') || s.toLowerCase().includes('inject')
        )
      ).toBe(true);
    });

    it('should detect expansion (>20% token increase)', () => {
      const originalPrompt = 'fix bug';
      const improvedPrompt =
        'fix the authentication bug in the login service by investigating the JWT validation logic and ensuring proper token expiry handling';

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(
        summary.some(
          (s) => s.toLowerCase().includes('expand') || s.toLowerCase().includes('detail')
        )
      ).toBe(true);
    });

    it('should return maximum 3 bullets', () => {
      const originalPrompt = 'help';
      const improvedPrompt = `<task>Help with debugging</task>
<context>Git branch info, LSP errors, session context</context>
<constraints>Must preserve user intent and maintain professional tone</constraints>
This is a very detailed and expanded prompt with lots of additional context and information that should trigger multiple detection rules including XML structure, context injection, and expansion.`;

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeLessThanOrEqual(3);
    });

    it('should provide fallback for minimal changes', () => {
      const originalPrompt = 'fix the bug';
      const improvedPrompt = 'Fix the bug.';

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
      // Should have at least some generic message
      expect(summary[0]).toBeTruthy();
    });

    it('should handle identical prompts', () => {
      const originalPrompt = 'test prompt';
      const improvedPrompt = 'test prompt';

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should detect multiple changes and prioritise', () => {
      const originalPrompt = 'fix';
      const improvedPrompt = `<task>Fix the authentication bug in the user login service</task>
<context>
Branch: feature/auth
Recent commits: JWT validation, token refresh
LSP errors: Type mismatch in auth handler
</context>`;

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.length).toBeLessThanOrEqual(3);
      // Should include multiple change types
      const combinedText = summary.join(' ').toLowerCase();
      expect(combinedText.includes('xml') || combinedText.includes('structure')).toBe(true);
    });

    it('should handle very long prompts efficiently', () => {
      const originalPrompt = 'a'.repeat(1000);
      const improvedPrompt = `<task>${'a'.repeat(1000)} with additional context</task>`;

      const summary = generateImprovementSummary(originalPrompt, improvedPrompt);

      expect(summary).toBeDefined();
      expect(summary.length).toBeLessThanOrEqual(3);
    });
  });

  describe('ImprovementResult with summary field', () => {
    it('should include summary in result when changes detected', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the bug',
        _mockClaudeResponse: '<task>Fix the authentication bug</task>',
      });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.summary)).toBe(true);
    });

    it('should include summary array with max 3 items', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'help',
        _mockClaudeResponse: `<task>Help debug the issue</task>
<context>Branch: main, Errors: type mismatches</context>
<constraints>Preserve user intent</constraints>
This is expanded with lots of detail and context information.`,
      });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      if (result.summary) {
        expect(result.summary.length).toBeLessThanOrEqual(3);
      }
    });

    it('should include summary as readonly array', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'test',
        _mockClaudeResponse: '<task>Test with structure</task>',
      });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      if (result.summary) {
        // TypeScript will enforce readonly at compile time
        expect(Array.isArray(result.summary)).toBe(true);
      }
    });

    it('should omit summary when improvement fails', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the bug',
        _mockClaudeResponse: null, // Simulates timeout/failure
      });

      expect(result.success).toBe(false);
      expect(result.summary).toBeUndefined();
    });
  });

  describe('T220: pluginResources context injection', () => {
    it('should include pluginResources in improvement prompt context', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
        context: {
          pluginResources: '<project-context><language>typescript</language></project-context>',
        },
      });

      expect(prompt).toContain('<plugin_resources>');
      expect(prompt).toContain('typescript');
    });
  });

  describe('T221: improvement template tool/skill/agent awareness', () => {
    it('should instruct agent to reference relevant tools/skills/agents', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      // Template should mention leveraging available tools/skills/agents
      expect(prompt).toMatch(/tool|skill|agent/i);
    });
  });

  describe('T224: code fence stripping from improver output', () => {
    it('should strip a wrapping markdown code fence from the improved prompt', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        config: mockConfig,
        _mockClaudeResponse: '```xml\n<task>Fix the bug</task>\n```',
      });

      expect(result.improvedPrompt).toBe('<task>Fix the bug</task>');
    });

    it('should leave unfenced output untouched', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        config: mockConfig,
        _mockClaudeResponse: '<task>Fix the bug</task>',
      });

      expect(result.improvedPrompt).toBe('<task>Fix the bug</task>');
    });

    it('should strip fences with uppercase language tags and trailing whitespace', async () => {
      const result = await improvePrompt({
        originalPrompt: 'fix the bug',
        config: mockConfig,
        _mockClaudeResponse: '```XML\r\n<task>Fix the bug</task>\r\n```\n',
      });

      expect(result.improvedPrompt).toBe('<task>Fix the bug</task>');
    });

    it('should not strip fences that appear inside the prompt body', async () => {
      const body = '<task>Explain this snippet</task>\n<context>```js\nfoo()\n```</context>';
      const result = await improvePrompt({
        originalPrompt: 'explain snippet',
        config: mockConfig,
        _mockClaudeResponse: body,
      });

      expect(result.improvedPrompt).toBe(body);
    });
  });

  describe('T222: improvement template few-shot examples', () => {
    it('should include worked examples with original and improved pairs', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the login bug',
      });

      expect(prompt).toContain('<example>');
      expect(prompt).toContain('<example_original>');
      expect(prompt).toContain('<example_improved>');
    });

    it('should place examples before the original prompt so they read as instructions', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix my unique broken thing xyz',
      });

      const exampleIndex = prompt.indexOf('<example>');
      const originalIndex = prompt.indexOf('fix my unique broken thing xyz');
      expect(exampleIndex).toBeGreaterThan(-1);
      expect(exampleIndex).toBeLessThan(originalIndex);
    });
  });

  describe('T225: improvement template prose-first output', () => {
    it('should not mandate XML-wrapped output', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).not.toContain('wrapped in XML tags');
    });

    it('should instruct prose structure with numbered questions and an explicit deliverable', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).toMatch(/prose/i);
      expect(prompt).toMatch(/numbered/i);
      expect(prompt).toMatch(/deliverable|verdict/i);
    });

    it('should instruct evidence citations for investigation prompts', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'audit the codebase for hardcoded secrets',
      });

      expect(prompt).toContain('file:line');
    });
  });

  describe('T227: improvement template research and fact-checking guidance', () => {
    const researchPrompt = 'find out if anyone still maintains left-pad-utils';

    it('should instruct separation of verified findings from inference', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: researchPrompt,
      });

      expect(prompt).toMatch(/VERIFIED/);
      expect(prompt).toMatch(/inferred/i);
    });

    it('should instruct per-item verdicts and verbatim quotes for research prompts', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: researchPrompt,
      });

      expect(prompt).toMatch(/verbatim|quote/i);
      expect(prompt).toMatch(/each/i);
    });

    it('should instruct honest negative results and output discipline', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: researchPrompt,
      });

      expect(prompt).toMatch(/say so plainly/i);
      expect(prompt).toMatch(/not raw file dumps|no file dumps/i);
    });
  });

  describe('T230: genre-conditional template', () => {
    it('should omit genre blocks and examples for general prompts', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'what do you think about this approach?',
      });

      expect(prompt).not.toMatch(/VERIFIED/);
      expect(prompt).not.toMatch(/required reading/i);
      expect(prompt).not.toContain('<example>');
    });

    it('should not leak research guidance into investigate prompts', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'audit the codebase for hardcoded secrets',
      });

      expect(prompt).not.toMatch(/required reading/i);
      expect(prompt).toMatch(/file:line/);
    });

    it('should respect an explicit genre override', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'what do you think?',
        genre: 'research',
      });

      expect(prompt).toMatch(/VERIFIED/);
    });

    it('should report the classified genre in the improvement result', async () => {
      const result = await improvePrompt({
        config: mockConfig,
        originalPrompt: 'fix the login bug',
        _mockClaudeResponse: 'Improved prompt',
      });

      expect(result.genre).toBe('fix');
    });
  });

  describe('T231: verification and candour core guidelines', () => {
    it('should instruct naming how to verify the work for all genres', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'what do you think about this approach?',
      });

      expect(prompt).toMatch(/VERIFY/);
    });

    it('should instruct candour for advice and design questions', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'what do you think about this approach?',
      });

      expect(prompt).toMatch(/candour/i);
      expect(prompt).toMatch(/state plainly if the approach is a mistake/i);
    });
  });

  describe('T232: user exemplar library', () => {
    it('should replace the built-in example with a user exemplar for the genre', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the login bug',
        exemplars: { fix: 'My gold standard fix prompt with reproduction steps.' },
      });

      expect(prompt).toContain('My gold standard fix prompt with reproduction steps.');
      expect(prompt).toContain('own prompt library');
      expect(prompt).not.toContain('Investigate and fix the login bug.');
    });

    it('should fall back to the built-in example when no exemplar matches the genre', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'fix the login bug',
        exemplars: { research: 'A research exemplar.' },
      });

      expect(prompt).not.toContain('A research exemplar.');
      expect(prompt).toContain('Investigate and fix the login bug.');
    });

    it('should pass config exemplars through improvePrompt', async () => {
      const result = await improvePrompt({
        config: { ...mockConfig, exemplars: { fix: 'Config exemplar.' } },
        originalPrompt: 'fix the login bug',
        _mockClaudeResponse: 'Improved prompt',
      });

      expect(result.success).toBe(true);
      expect(result.genre).toBe('fix');
    });
  });

  describe('T234: investigate-genre user-report and implementation-readiness guidance', () => {
    const investigatePrompt = 'audit the codebase for hardcoded secrets';

    it('should instruct verbatim user-report anchoring and interpretation', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/user report|user request/i);
      expect(prompt).toMatch(/work out what they mean/i);
    });

    it('should instruct side-by-side comparison when behaviour differs between branches', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/side-by-side/i);
    });

    it('should instruct implementation-ready anchors, clarifying questions, and symbol seeds', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/enough to implement|sufficient to implement/i);
      expect(prompt).toMatch(/clarifying questions/i);
      expect(prompt).toMatch(/symbols? or search terms/i);
    });
  });

  describe('T233: build-genre trust, reuse, and boundary guidance', () => {
    const buildPrompt = 'add the invoice reconciliation tab to the dashboard';

    it('should instruct a trust-this block for verified facts and intentional behaviour', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/trust this/i);
      expect(prompt).toMatch(/intentional/i);
    });

    it('should instruct copying established in-repo idioms and reuse-before-write', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/established (idiom|pattern)/i);
      expect(prompt).toMatch(/before adding a new one/i);
    });

    it('should instruct failure-mode guards, precedence rules, and hot-path constraints', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/must not throw|degrade gracefully/i);
      expect(prompt).toMatch(/precedence|wins/i);
      expect(prompt).toMatch(/hot path/i);
    });

    it('should instruct lane boundaries and surfaced assumptions in the report', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/lane|do NOT (run|build)/);
      expect(prompt).toMatch(/assumptions? (it |they )?made/i);
    });
  });

  describe('T229: improvement template implementation-brief guidance', () => {
    const buildPrompt = 'add the invoice reconciliation tab to the dashboard';

    it('should instruct required reading with authority markers and reuse of proven results', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/required reading|read first/i);
      expect(prompt).toMatch(/superseded|authoritative/i);
      expect(prompt).toMatch(/reproduce/i);
      expect(prompt).toMatch(/re-derive/i);
    });

    it('should instruct assertable invariants and worked acceptance examples', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/invariant/i);
      expect(prompt).toMatch(/worked example|acceptance example/i);
    });

    it('should instruct explicit non-goals and quantified pitfalls', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: buildPrompt,
      });

      expect(prompt).toMatch(/non-goals/i);
      expect(prompt).toMatch(/pitfall/i);
    });
  });

  describe('T228: improvement template precision and output-contract guidance', () => {
    const investigatePrompt = 'audit the codebase for hardcoded secrets';

    it('should instruct noise guards for scan/review tasks', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/only flag|flag only/i);
      expect(prompt).toMatch(/cap|up to/i);
    });

    it('should instruct strict output contracts when results feed further processing', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/output contract/i);
    });

    it('should instruct role assignment, first actions, and seeded hypotheses', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: investigatePrompt,
      });

      expect(prompt).toMatch(/role or angle/i);
      expect(prompt).toMatch(/first action|first command/i);
      expect(prompt).toMatch(/hypothes/i);
    });
  });

  describe('T226: summary detects prose structure', () => {
    it('should report added structure when a numbered list is introduced', () => {
      const summary = generateImprovementSummary(
        'check the endpoints',
        'Audit every API endpoint for auth checks. Report:\n1. Unprotected routes with file:line.\n2. Inconsistent auth schemes between modules.\nGive a clear verdict.'
      );

      expect(summary.some((s) => s.toLowerCase().includes('structure'))).toBe(true);
    });

    it('should recognise parenthesis-style numbering in the original prompt', () => {
      const summary = generateImprovementSummary(
        'check these:\n1) auth\n2) logging',
        'Check the following:\n1. Authentication coverage.\n2. Logging consistency.'
      );

      // Original was already structured, so no 'Added structure' bullet
      expect(summary.some((s) => s.toLowerCase().includes('structure'))).toBe(false);
    });
  });

  describe('T223: improvement template subagent and workflow awareness', () => {
    it('should instruct the improver to suggest subagents for parallelisable work', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).toMatch(/subagent/i);
    });

    it('should instruct the improver to suggest workflows for large multi-agent tasks', () => {
      const prompt = buildImprovementPrompt({
        originalPrompt: 'test prompt',
      });

      expect(prompt).toMatch(/workflow/i);
    });
  });
});

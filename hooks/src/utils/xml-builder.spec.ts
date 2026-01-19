/**
 * T041-T044: XML Builder tests
 * T041: Test XML builder applies task/context/constraints tags for COMPLEX
 * T042: Test XML builder skips tags for simple prompts
 * T043: Test XML builder escapes existing XML content
 * T044: Test XML builder supports output_format and examples tags
 */
import { describe, expect, it } from 'bun:test';
import {
  buildXmlPrompt,
  escapeXmlContent,
  shouldApplyXmlTags,
  wrapInTag,
  type XmlPromptParts,
} from './xml-builder.ts';

describe('XML Builder', () => {
  describe('T041: buildXmlPrompt - applies task/context/constraints tags for COMPLEX', () => {
    it('should wrap task in <task> tag', () => {
      const parts: XmlPromptParts = {
        task: 'Fix the authentication bug',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<task>');
      expect(result).toContain('</task>');
      expect(result).toContain('Fix the authentication bug');
    });

    it('should wrap context in <context> tag', () => {
      const parts: XmlPromptParts = {
        task: 'Fix the bug',
        context: 'Recent commits show JWT work',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<context>');
      expect(result).toContain('</context>');
      expect(result).toContain('Recent commits show JWT work');
    });

    it('should wrap constraints in <constraints> tag', () => {
      const parts: XmlPromptParts = {
        task: 'Fix the bug',
        constraints: 'Maintain backward compatibility',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<constraints>');
      expect(result).toContain('</constraints>');
      expect(result).toContain('Maintain backward compatibility');
    });

    it('should include all three tags when provided', () => {
      const parts: XmlPromptParts = {
        task: 'Implement feature',
        context: 'Working on auth module',
        constraints: 'No breaking changes',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<task>');
      expect(result).toContain('<context>');
      expect(result).toContain('<constraints>');
    });

    it('should order tags: task, context, constraints', () => {
      const parts: XmlPromptParts = {
        task: 'Task content',
        context: 'Context content',
        constraints: 'Constraints content',
      };

      const result = buildXmlPrompt(parts);
      const taskIndex = result.indexOf('<task>');
      const contextIndex = result.indexOf('<context>');
      const constraintsIndex = result.indexOf('<constraints>');

      expect(taskIndex).toBeLessThan(contextIndex);
      expect(contextIndex).toBeLessThan(constraintsIndex);
    });
  });

  describe('T042: shouldApplyXmlTags - skips tags for simple prompts', () => {
    it('should return false for NONE classification', () => {
      expect(shouldApplyXmlTags('NONE')).toBe(false);
    });

    it('should return false for SIMPLE classification', () => {
      expect(shouldApplyXmlTags('SIMPLE')).toBe(false);
    });

    it('should return true for COMPLEX classification', () => {
      expect(shouldApplyXmlTags('COMPLEX')).toBe(true);
    });
  });

  describe('T043: escapeXmlContent - escapes existing XML content', () => {
    it('should escape < character', () => {
      const result = escapeXmlContent('a < b');
      expect(result).toBe('a &lt; b');
    });

    it('should escape > character', () => {
      const result = escapeXmlContent('a > b');
      expect(result).toBe('a &gt; b');
    });

    it('should escape & character', () => {
      const result = escapeXmlContent('a & b');
      expect(result).toBe('a &amp; b');
    });

    it('should escape " character', () => {
      const result = escapeXmlContent('say "hello"');
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('should escape \' character', () => {
      const result = escapeXmlContent("it's");
      expect(result).toBe('it&apos;s');
    });

    it('should handle multiple special characters', () => {
      const result = escapeXmlContent('<div class="test">Hello & goodbye</div>');
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;Hello &amp; goodbye&lt;/div&gt;');
    });

    it('should handle text without special characters', () => {
      const result = escapeXmlContent('plain text');
      expect(result).toBe('plain text');
    });

    it('should handle empty string', () => {
      const result = escapeXmlContent('');
      expect(result).toBe('');
    });
  });

  describe('T044: buildXmlPrompt - supports output_format and examples tags', () => {
    it('should wrap output_format in <output_format> tag', () => {
      const parts: XmlPromptParts = {
        task: 'Generate code',
        output_format: 'TypeScript with JSDoc comments',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<output_format>');
      expect(result).toContain('</output_format>');
      expect(result).toContain('TypeScript with JSDoc comments');
    });

    it('should wrap examples in <examples> tag', () => {
      const parts: XmlPromptParts = {
        task: 'Format dates',
        examples: 'Input: 2026-01-18\nOutput: January 18, 2026',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<examples>');
      expect(result).toContain('</examples>');
      expect(result).toContain('Input: 2026-01-18');
    });

    it('should include all five tags when provided', () => {
      const parts: XmlPromptParts = {
        task: 'Build feature',
        context: 'Auth module',
        constraints: 'No breaking changes',
        output_format: 'TypeScript',
        examples: 'Example here',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<task>');
      expect(result).toContain('<context>');
      expect(result).toContain('<constraints>');
      expect(result).toContain('<output_format>');
      expect(result).toContain('<examples>');
    });

    it('should order all tags correctly: task, context, constraints, output_format, examples', () => {
      const parts: XmlPromptParts = {
        task: 'Task',
        context: 'Context',
        constraints: 'Constraints',
        output_format: 'Format',
        examples: 'Examples',
      };

      const result = buildXmlPrompt(parts);
      const indices = [
        result.indexOf('<task>'),
        result.indexOf('<context>'),
        result.indexOf('<constraints>'),
        result.indexOf('<output_format>'),
        result.indexOf('<examples>'),
      ];

      for (let i = 0; i < indices.length - 1; i++) {
        expect(indices[i]).toBeLessThan(indices[i + 1]!);
      }
    });
  });

  describe('wrapInTag', () => {
    it('should wrap content in specified tag', () => {
      const result = wrapInTag('task', 'Do something');
      expect(result).toBe('<task>\nDo something\n</task>');
    });

    it('should handle multiline content', () => {
      const result = wrapInTag('context', 'Line 1\nLine 2\nLine 3');
      expect(result).toBe('<context>\nLine 1\nLine 2\nLine 3\n</context>');
    });

    it('should handle empty content', () => {
      const result = wrapInTag('task', '');
      expect(result).toBe('<task>\n\n</task>');
    });
  });

  describe('buildXmlPrompt edge cases', () => {
    it('should only include provided tags', () => {
      const parts: XmlPromptParts = {
        task: 'Only task',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<task>');
      expect(result).not.toContain('<context>');
      expect(result).not.toContain('<constraints>');
      expect(result).not.toContain('<output_format>');
      expect(result).not.toContain('<examples>');
    });

    it('should handle task with context only', () => {
      const parts: XmlPromptParts = {
        task: 'Task here',
        context: 'Context here',
      };

      const result = buildXmlPrompt(parts);

      expect(result).toContain('<task>');
      expect(result).toContain('<context>');
      expect(result).not.toContain('<constraints>');
    });
  });
});

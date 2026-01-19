/**
 * XML Builder for structured prompts
 * Applies XML tags per Anthropic best practices for complex prompts
 */
import type { ClassificationLevel, XmlTag } from '../core/types.ts';

/**
 * Parts of an XML-structured prompt
 */
export interface XmlPromptParts {
  readonly task: string;
  readonly context?: string;
  readonly constraints?: string;
  readonly output_format?: string;
  readonly examples?: string;
}

/**
 * Tag ordering for XML prompts (matches Anthropic recommendations)
 */
const TAG_ORDER: readonly XmlTag[] = [
  'task',
  'context',
  'constraints',
  'output_format',
  'examples',
] as const;

/**
 * Escapes special XML characters in content
 */
export function escapeXmlContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wraps content in an XML tag
 */
export function wrapInTag(tag: XmlTag, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}

/**
 * Determines whether to apply XML tags based on classification
 * Only COMPLEX prompts get XML structure
 */
export function shouldApplyXmlTags(classification: ClassificationLevel): boolean {
  return classification === 'COMPLEX';
}

/**
 * Builds an XML-structured prompt from parts
 * Tags are ordered: task, context, constraints, output_format, examples
 */
export function buildXmlPrompt(parts: XmlPromptParts): string {
  const sections: string[] = [];

  // Add tags in order, only if content is provided
  for (const tag of TAG_ORDER) {
    const content = parts[tag];
    if (content !== undefined) {
      sections.push(wrapInTag(tag, content));
    }
  }

  return sections.join('\n\n');
}

/**
 * Extracts applied tags from parts for logging
 */
export function getAppliedTags(parts: XmlPromptParts): XmlTag[] {
  const tags: XmlTag[] = [];

  for (const tag of TAG_ORDER) {
    if (parts[tag] !== undefined) {
      tags.push(tag);
    }
  }

  return tags;
}

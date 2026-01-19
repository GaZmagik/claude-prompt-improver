/**
 * Agent suggester for matching prompts to available agents
 * Reads agent definitions and suggests relevant agents based on prompt content
 */
import { matchItemsByKeywords } from '../utils/keyword-matcher.ts';

/**
 * Agent definition parsed from markdown
 */
export interface AgentDefinition {
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly filePath: string;
}

/**
 * Result of suggesting an agent
 */
export interface SuggestedAgent {
  readonly agent: AgentDefinition;
  readonly score: number;
  readonly matchedKeywords: readonly string[];
}

/**
 * Extracts keywords from description text
 */
function extractKeywords(text: string): string[] {
  // Extract meaningful words (3+ chars, lowercase)
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  // Filter common stop words
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'use',
    'with',
    'this',
    'that',
    'from',
    'are',
    'was',
    'has',
    'have',
  ]);
  return [...new Set(words.filter((w) => !stopWords.has(w)))];
}

/**
 * Parses agent definition from markdown content
 */
export function parseAgentDefinition(content: string, filename: string): AgentDefinition | null {
  if (!content || content.trim().length === 0) {
    return null;
  }

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1] || '';

  // Parse name
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch?.[1]?.trim() || filename.replace(/\.md$/, '');

  // Parse description
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const description = descMatch?.[1]?.trim() || '';

  if (!description) {
    return null;
  }

  // Extract keywords from description and name
  const keywords = extractKeywords(`${name} ${description}`);

  return {
    name,
    description,
    keywords,
    filePath: filename,
  };
}

/**
 * Suggests agents based on prompt content
 */
export function suggestAgents(
  prompt: string,
  agents: AgentDefinition[] | null | undefined
): SuggestedAgent[] {
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return [];
  }

  // Use shared keyword matching utility
  const results = matchItemsByKeywords(prompt, agents, (agent) => agent.keywords);

  return results.map(({ item, matchedKeywords, score }) => ({
    agent: item,
    score,
    matchedKeywords,
  }));
}

/**
 * Formats suggested agents as context string for prompt injection
 */
export function formatAgentsContext(suggestions: SuggestedAgent[]): string {
  if (suggestions.length === 0) {
    return '';
  }

  return suggestions.map((s) => `- ${s.agent.name}: ${s.agent.description}`).join('\n');
}

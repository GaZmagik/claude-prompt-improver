/**
 * Skill matcher for matching prompts to available skills
 * Reads skill rules and matches keywords to suggest relevant skills
 */
import { matchItemsByKeywords } from '../utils/keyword-matcher.ts';

/**
 * Skill rule definition
 */
export interface SkillRule {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
}

/**
 * Result of matching a skill
 */
export interface MatchedSkill {
  readonly skill: SkillRule;
  readonly matchedKeywords: readonly string[];
}

/**
 * Parses skill rules from JSON content
 */
export function loadSkillRules(jsonContent: string): SkillRule[] {
  try {
    const parsed = JSON.parse(jsonContent) as { skills?: unknown[] };
    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      return [];
    }

    return parsed.skills
      .filter(
        (s): s is { name: string; keywords: string[]; description: string } =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as { name?: unknown }).name === 'string' &&
          Array.isArray((s as { keywords?: unknown }).keywords) &&
          typeof (s as { description?: unknown }).description === 'string'
      )
      .map((s) => ({
        name: s.name,
        keywords: s.keywords,
        description: s.description,
      }));
  } catch {
    return [];
  }
}

/**
 * Matches prompt text against skill keywords
 */
export function matchSkills(prompt: string, rules: SkillRule[] | null | undefined): MatchedSkill[] {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return [];
  }

  // Use shared keyword matching utility
  const results = matchItemsByKeywords(prompt, rules, (skill) => skill.keywords);

  return results.map(({ item, matchedKeywords }) => ({
    skill: item,
    matchedKeywords,
  }));
}

/**
 * Formats matched skills as context string for prompt injection
 */
export function formatSkillsContext(matches: MatchedSkill[]): string {
  if (matches.length === 0) {
    return '';
  }

  return matches.map((m) => `- ${m.skill.name}: ${m.skill.description}`).join('\n');
}

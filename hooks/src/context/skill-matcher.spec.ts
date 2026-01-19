/**
 * T064-T066: Skill Matcher tests
 * T064: Test skill matcher reads skill-rules.json if available
 * T065: Test skill matcher matches prompt keywords to skills
 * T066: Test skill matcher gracefully skips if skill-rules.json missing
 */
import { describe, expect, it } from 'bun:test';
import {
  matchSkills,
  loadSkillRules,
  formatSkillsContext,
  type SkillRule,
  type MatchedSkill,
} from './skill-matcher.ts';

describe('Skill Matcher', () => {
  describe('T064: loadSkillRules - reads skill-rules.json if available', () => {
    it('should parse skill rules from JSON content', () => {
      const rulesJson = JSON.stringify({
        skills: [
          {
            name: 'commit',
            keywords: ['commit', 'git', 'push'],
            description: 'Git commit workflow',
          },
          {
            name: 'memory',
            keywords: ['remember', 'recall', 'memory'],
            description: 'Memory operations',
          },
        ],
      });

      const result = loadSkillRules(rulesJson);

      expect(result.length).toBe(2);
      expect(result[0]!.name).toBe('commit');
      expect(result[1]!.name).toBe('memory');
    });

    it('should extract keywords from skill rules', () => {
      const rulesJson = JSON.stringify({
        skills: [{ name: 'test', keywords: ['test', 'testing', 'spec'], description: 'Run tests' }],
      });

      const result = loadSkillRules(rulesJson);

      expect(result[0]!.keywords).toContain('test');
      expect(result[0]!.keywords).toContain('testing');
      expect(result[0]!.keywords).toContain('spec');
    });

    it('should handle empty skills array', () => {
      const rulesJson = JSON.stringify({ skills: [] });

      const result = loadSkillRules(rulesJson);

      expect(result).toEqual([]);
    });

    it('should handle malformed JSON gracefully', () => {
      const result = loadSkillRules('not valid json');

      expect(result).toEqual([]);
    });

    it('should handle missing skills property', () => {
      const rulesJson = JSON.stringify({ other: 'data' });

      const result = loadSkillRules(rulesJson);

      expect(result).toEqual([]);
    });
  });

  describe('T065: matchSkills - matches prompt keywords to skills', () => {
    const sampleRules: SkillRule[] = [
      { name: 'commit', keywords: ['commit', 'git', 'push'], description: 'Git commit workflow' },
      {
        name: 'memory',
        keywords: ['remember', 'recall', 'memory', 'store'],
        description: 'Memory operations',
      },
      { name: 'review', keywords: ['review', 'pr', 'pull request'], description: 'Code review' },
    ];

    it('should match single keyword to skill', () => {
      const result = matchSkills('help me commit the changes', sampleRules);

      expect(result.length).toBe(1);
      expect(result[0]!.skill.name).toBe('commit');
    });

    it('should match multiple keywords to same skill', () => {
      const result = matchSkills('git commit and push', sampleRules);

      expect(result.length).toBe(1);
      expect(result[0]!.skill.name).toBe('commit');
      expect(result[0]!.matchedKeywords.length).toBeGreaterThanOrEqual(2);
    });

    it('should match keywords to multiple skills', () => {
      const result = matchSkills('commit the changes and remember to review', sampleRules);

      expect(result.length).toBe(3);
      const names = result.map((r) => r.skill.name);
      expect(names).toContain('commit');
      expect(names).toContain('memory');
      expect(names).toContain('review');
    });

    it('should be case-insensitive when matching', () => {
      const result = matchSkills('COMMIT THE CHANGES', sampleRules);

      expect(result.length).toBe(1);
      expect(result[0]!.skill.name).toBe('commit');
    });

    it('should return empty array when no matches', () => {
      const result = matchSkills('hello world', sampleRules);

      expect(result).toEqual([]);
    });

    it('should handle multi-word keywords like "pull request"', () => {
      const result = matchSkills('create a pull request', sampleRules);

      expect(result.length).toBe(1);
      expect(result[0]!.skill.name).toBe('review');
    });

    it('should sort results by match count (most relevant first)', () => {
      const result = matchSkills('git commit and push to remote', sampleRules);

      // Should have commit skill first as it matches git, commit, push
      expect(result[0]!.skill.name).toBe('commit');
    });
  });

  describe('T066: matchSkills - gracefully skips if skill-rules.json missing', () => {
    it('should return empty array when rules are empty', () => {
      const result = matchSkills('commit the changes', []);

      expect(result).toEqual([]);
    });

    it('should return empty array when rules are undefined', () => {
      const result = matchSkills('commit the changes', undefined as unknown as SkillRule[]);

      expect(result).toEqual([]);
    });

    it('should handle null rules gracefully', () => {
      const result = matchSkills('commit the changes', null as unknown as SkillRule[]);

      expect(result).toEqual([]);
    });
  });

  describe('formatSkillsContext', () => {
    it('should format matched skills as readable string', () => {
      const matches: MatchedSkill[] = [
        {
          skill: { name: 'commit', keywords: ['commit'], description: 'Git commit workflow' },
          matchedKeywords: ['commit'],
        },
      ];

      const result = formatSkillsContext(matches);

      expect(result).toContain('commit');
      expect(result).toContain('Git commit workflow');
    });

    it('should return empty string for no matches', () => {
      const result = formatSkillsContext([]);

      expect(result).toBe('');
    });

    it('should list multiple skills', () => {
      const matches: MatchedSkill[] = [
        {
          skill: { name: 'commit', keywords: ['commit'], description: 'Git commit' },
          matchedKeywords: ['commit'],
        },
        {
          skill: { name: 'memory', keywords: ['memory'], description: 'Memory ops' },
          matchedKeywords: ['memory'],
        },
      ];

      const result = formatSkillsContext(matches);

      expect(result).toContain('commit');
      expect(result).toContain('memory');
    });
  });
});

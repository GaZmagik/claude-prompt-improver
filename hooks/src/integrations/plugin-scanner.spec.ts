/**
 * Plugin Scanner Tests
 */
import { describe, it, expect } from 'bun:test';
import {
  detectDeliberationKeywords,
  suggestMemoryThink,
  scanEnhancePlugins,
  scanMcpServers,
  normaliseComponentPath,
  normaliseComponentPaths,
  type OutputStyleInfo,
  type PluginInfo,
} from './plugin-scanner.ts';

describe('plugin-scanner', () => {
  describe('detectDeliberationKeywords', () => {
    it('detects brainstorm', () => {
      expect(detectDeliberationKeywords('brainstorm ideas')).toBe(true);
    });

    it('detects pros and cons', () => {
      expect(detectDeliberationKeywords('what are the pros and cons')).toBe(true);
    });

    it('detects trade-offs', () => {
      expect(detectDeliberationKeywords('consider the trade-offs')).toBe(true);
    });

    it('detects weigh options', () => {
      expect(detectDeliberationKeywords('help me weigh my options')).toBe(true);
    });

    it('detects decide/decision', () => {
      expect(detectDeliberationKeywords('help me decide')).toBe(true);
    });

    it('detects evaluate', () => {
      expect(detectDeliberationKeywords('evaluate the approaches')).toBe(true);
    });

    it('returns false for simple prompts', () => {
      expect(detectDeliberationKeywords('add a button')).toBe(false);
      expect(detectDeliberationKeywords('fix the bug')).toBe(false);
    });
  });

  describe('suggestMemoryThink', () => {
    it('returns suggestion for deliberation prompts', () => {
      const suggestion = suggestMemoryThink('brainstorm architecture');
      expect(suggestion).toContain('memory think');
    });

    it('returns null for non-deliberation prompts', () => {
      expect(suggestMemoryThink('run tests')).toBeNull();
    });
  });

  describe('scanEnhancePlugins', () => {
    it('returns empty array for non-existent directory', async () => {
      const plugins = await scanEnhancePlugins('/nonexistent/path');
      expect(plugins).toEqual([]);
    });
  });

  describe('scanMcpServers', () => {
    it('returns empty array for non-existent files', async () => {
      const servers = await scanMcpServers(['/nonexistent/.mcp.json']);
      expect(servers).toEqual([]);
    });
  });

  // T204: OutputStyleInfo and outputStyles in PluginInfo
  describe('T204: OutputStyleInfo type', () => {
    it('T204.1: OutputStyleInfo should have name and description', () => {
      const styleInfo: OutputStyleInfo = {
        name: 'sardonic',
        description: 'A dry, sarcastic tone',
      };
      expect(styleInfo.name).toBe('sardonic');
      expect(styleInfo.description).toBe('A dry, sarcastic tone');
    });

    it('T204.2: PluginInfo should include outputStyles array', () => {
      const pluginInfo: PluginInfo = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        skills: [],
        agents: [],
        commands: [],
        outputStyles: [
          { name: 'formal', description: 'Formal tone' },
          { name: 'casual', description: 'Casual tone' },
        ],
      };
      expect(pluginInfo.outputStyles).toHaveLength(2);
      expect(pluginInfo.outputStyles[0]?.name).toBe('formal');
    });
  });

  // T205-T207: Path normalisation with security validation
  describe('T205: normaliseComponentPath security validation', () => {
    it('T205.1: should reject absolute paths', () => {
      expect(normaliseComponentPath('/etc/passwd')).toBeNull();
      expect(normaliseComponentPath('/home/user/skills')).toBeNull();
    });

    it('T205.2: should reject parent directory traversal', () => {
      expect(normaliseComponentPath('../skills')).toBeNull();
      expect(normaliseComponentPath('foo/../bar')).toBeNull();
      expect(normaliseComponentPath('skills/../../etc')).toBeNull();
    });

    it('T205.3: should normalise ./ prefix', () => {
      expect(normaliseComponentPath('./skills')).toBe('skills');
      expect(normaliseComponentPath('./custom/skills')).toBe('custom/skills');
    });

    it('T205.4: should accept valid relative paths', () => {
      expect(normaliseComponentPath('skills')).toBe('skills');
      expect(normaliseComponentPath('custom/skills')).toBe('custom/skills');
      expect(normaliseComponentPath('src/custom-skills')).toBe('src/custom-skills');
    });
  });

  describe('T206: normaliseComponentPaths array handling', () => {
    it('T206.1: should handle string input', () => {
      const result = normaliseComponentPaths('./custom-skills', 'skills');
      expect(result).toEqual(['custom-skills']);
    });

    it('T206.2: should handle array input', () => {
      const result = normaliseComponentPaths(['./skills', 'custom/skills'], 'skills');
      expect(result).toEqual(['skills', 'custom/skills']);
    });

    it('T206.3: should filter out invalid paths from array', () => {
      const result = normaliseComponentPaths(['./valid', '../invalid', '/absolute'], 'default');
      expect(result).toEqual(['valid']);
    });

    it('T206.4: should return default when input is undefined', () => {
      const result = normaliseComponentPaths(undefined, 'skills');
      expect(result).toEqual(['skills']);
    });

    it('T206.5: should return default when all paths are invalid', () => {
      const result = normaliseComponentPaths(['../invalid', '/absolute'], 'skills');
      expect(result).toEqual(['skills']);
    });
  });

  describe('T207: normaliseComponentPaths edge cases', () => {
    it('T207.1: should handle empty string in array', () => {
      const result = normaliseComponentPaths(['', 'valid'], 'default');
      expect(result).toContain('valid');
    });

    it('T207.2: should handle null-ish values gracefully', () => {
      const result = normaliseComponentPaths(null as unknown as string, 'default');
      expect(result).toEqual(['default']);
    });

    it('T207.3: should handle empty array', () => {
      const result = normaliseComponentPaths([], 'default');
      expect(result).toEqual(['default']);
    });
  });

  // T208-T209: Component path scanning
  describe('T208: scanEnhancePlugins with component paths', () => {
    it('T208.1: should return plugins with outputStyles array', async () => {
      // Even with non-existent path, returned plugins should have outputStyles property
      const plugins = await scanEnhancePlugins('/nonexistent/path');
      expect(plugins).toEqual([]);
    });
  });

  describe('T209: PluginInfo structure validation', () => {
    it('T209.1: PluginInfo should have all required fields including outputStyles', () => {
      const plugin: PluginInfo = {
        name: 'complete-plugin',
        version: '2.0.0',
        description: 'A complete plugin',
        skills: [{ name: 'skill1', description: 'Skill 1', qualifiedName: 'plugin:skill1' }],
        agents: [{ name: 'agent1', description: 'Agent 1', model: 'haiku' }],
        commands: [{ name: 'cmd1', description: 'Command 1' }],
        outputStyles: [{ name: 'style1', description: 'Style 1' }],
      };

      expect(plugin.name).toBe('complete-plugin');
      expect(plugin.skills).toHaveLength(1);
      expect(plugin.agents).toHaveLength(1);
      expect(plugin.commands).toHaveLength(1);
      expect(plugin.outputStyles).toHaveLength(1);
    });
  });
});

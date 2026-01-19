/**
 * T062-T063: Tool Detector tests
 * T062: Test tool detector parses available_tools from stdin
 * T063: Test tool detector recognises Read/Write/Edit/Grep/Glob/Bash tools
 */
import { describe, expect, it } from 'bun:test';
import {
  detectTools,
  formatToolsContext,
  CORE_TOOLS,
  type DetectedTools,
} from './tool-detector.ts';

describe('Tool Detector', () => {
  describe('T062: detectTools - parses available_tools from stdin', () => {
    it('should parse available_tools array from hook context', () => {
      const availableTools = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'];

      const result = detectTools(availableTools);

      expect(result.tools).toEqual(availableTools);
      expect(result.count).toBe(6);
    });

    it('should handle empty tools array', () => {
      const result = detectTools([]);

      expect(result.tools).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should handle undefined tools', () => {
      const result = detectTools(undefined);

      expect(result.tools).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should preserve tool order', () => {
      const availableTools = ['Bash', 'Read', 'Write'];

      const result = detectTools(availableTools);

      expect(result.tools[0]).toBe('Bash');
      expect(result.tools[1]).toBe('Read');
      expect(result.tools[2]).toBe('Write');
    });

    it('should handle MCP tools with namespaced names', () => {
      const availableTools = ['Read', 'mcp__ide__getDiagnostics', 'mcp__context7__query'];

      const result = detectTools(availableTools);

      expect(result.tools).toContain('mcp__ide__getDiagnostics');
      expect(result.mcpTools).toContain('mcp__ide__getDiagnostics');
    });

    it('should separate core tools from MCP tools', () => {
      const availableTools = ['Read', 'Write', 'mcp__ide__getDiagnostics'];

      const result = detectTools(availableTools);

      expect(result.coreTools).toEqual(['Read', 'Write']);
      expect(result.mcpTools).toEqual(['mcp__ide__getDiagnostics']);
    });
  });

  describe('T063: detectTools - recognises Read/Write/Edit/Grep/Glob/Bash', () => {
    it('should identify Read tool as core tool', () => {
      const result = detectTools(['Read']);

      expect(result.hasRead).toBe(true);
      expect(result.coreTools).toContain('Read');
    });

    it('should identify Write tool as core tool', () => {
      const result = detectTools(['Write']);

      expect(result.hasWrite).toBe(true);
      expect(result.coreTools).toContain('Write');
    });

    it('should identify Edit tool as core tool', () => {
      const result = detectTools(['Edit']);

      expect(result.hasEdit).toBe(true);
      expect(result.coreTools).toContain('Edit');
    });

    it('should identify Grep tool as core tool', () => {
      const result = detectTools(['Grep']);

      expect(result.hasGrep).toBe(true);
      expect(result.coreTools).toContain('Grep');
    });

    it('should identify Glob tool as core tool', () => {
      const result = detectTools(['Glob']);

      expect(result.hasGlob).toBe(true);
      expect(result.coreTools).toContain('Glob');
    });

    it('should identify Bash tool as core tool', () => {
      const result = detectTools(['Bash']);

      expect(result.hasBash).toBe(true);
      expect(result.coreTools).toContain('Bash');
    });

    it('should verify CORE_TOOLS constant includes all expected tools', () => {
      expect(CORE_TOOLS).toContain('Read');
      expect(CORE_TOOLS).toContain('Write');
      expect(CORE_TOOLS).toContain('Edit');
      expect(CORE_TOOLS).toContain('Grep');
      expect(CORE_TOOLS).toContain('Glob');
      expect(CORE_TOOLS).toContain('Bash');
    });

    it('should detect all core tools when present', () => {
      const allCore = ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'];

      const result = detectTools(allCore);

      expect(result.hasRead).toBe(true);
      expect(result.hasWrite).toBe(true);
      expect(result.hasEdit).toBe(true);
      expect(result.hasGrep).toBe(true);
      expect(result.hasGlob).toBe(true);
      expect(result.hasBash).toBe(true);
    });

    it('should correctly handle mixed core and non-core tools', () => {
      const mixed = ['Read', 'Task', 'Write', 'WebSearch', 'Bash'];

      const result = detectTools(mixed);

      expect(result.hasRead).toBe(true);
      expect(result.hasWrite).toBe(true);
      expect(result.hasBash).toBe(true);
      expect(result.coreTools).toEqual(['Read', 'Write', 'Bash']);
    });
  });

  describe('formatToolsContext', () => {
    it('should format tools as readable string', () => {
      const detected: DetectedTools = {
        tools: ['Read', 'Write', 'Bash'],
        coreTools: ['Read', 'Write', 'Bash'],
        mcpTools: [],
        count: 3,
        hasRead: true,
        hasWrite: true,
        hasEdit: false,
        hasGrep: false,
        hasGlob: false,
        hasBash: true,
      };

      const result = formatToolsContext(detected);

      expect(result).toContain('Read');
      expect(result).toContain('Write');
      expect(result).toContain('Bash');
    });

    it('should return empty string for no tools', () => {
      const detected: DetectedTools = {
        tools: [],
        coreTools: [],
        mcpTools: [],
        count: 0,
        hasRead: false,
        hasWrite: false,
        hasEdit: false,
        hasGrep: false,
        hasGlob: false,
        hasBash: false,
      };

      const result = formatToolsContext(detected);

      expect(result).toBe('');
    });

    it('should mention MCP tools when present', () => {
      const detected: DetectedTools = {
        tools: ['Read', 'mcp__ide__getDiagnostics'],
        coreTools: ['Read'],
        mcpTools: ['mcp__ide__getDiagnostics'],
        count: 2,
        hasRead: true,
        hasWrite: false,
        hasEdit: false,
        hasGrep: false,
        hasGlob: false,
        hasBash: false,
      };

      const result = formatToolsContext(detected);

      expect(result).toContain('mcp__ide__getDiagnostics');
    });
  });
});

/**
 * T090-T097: LSP diagnostics integration tests
 * T090: Test LSP diagnostics invokes mcp__ide__getDiagnostics
 * T091: Test LSP diagnostics filters to errors first, then warnings
 * T092: Test LSP diagnostics limits to 5 most relevant
 * T093: Test LSP diagnostics matches file paths to prompt keywords
 * T094: Test LSP diagnostics includes file path, line number, message
 * T095: Test LSP diagnostics gracefully skips if LSP not configured
 * T096: Test LSP diagnostics gracefully skips if configuration.integrations.lsp=false
 * T097: Test LSP diagnostics only injected for debugging-related prompts
 */
import { describe, expect, it } from 'bun:test';
import {
  type Diagnostic,
  type LspContext,
  filterDiagnostics,
  formatLspContext,
  gatherLspDiagnostics,
  isDebuggingPrompt,
  matchDiagnosticsToPrompt,
  parseTscOutput,
} from './lsp-diagnostics.ts';

describe('LSP Diagnostics Integration', () => {
  describe('T090: gatherLspDiagnostics - invokes MCP getDiagnostics', () => {
    it('should call mcp__ide__getDiagnostics when available', async () => {
      let mcpCalled = false;
      const result = await gatherLspDiagnostics({
        _mockMcpCall: async () => {
          mcpCalled = true;
          return { diagnostics: [] };
        },
      });

      expect(mcpCalled).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should return diagnostics from MCP response', async () => {
      const mockDiagnostics: Diagnostic[] = [
        {
          filePath: 'src/auth.ts',
          line: 42,
          column: 10,
          severity: 'error',
          message: 'Type error: string is not assignable to number',
          source: 'typescript',
        },
      ];

      const result = await gatherLspDiagnostics({
        _mockMcpCall: async () => ({ diagnostics: mockDiagnostics }),
      });

      expect(result.success).toBe(true);
      expect(result.context?.diagnostics.length).toBe(1);
    });
  });

  describe('T091: filterDiagnostics - filters errors first, then warnings', () => {
    it('should prioritize errors over warnings', () => {
      const diagnostics: Diagnostic[] = [
        {
          filePath: 'a.ts',
          line: 1,
          column: 1,
          severity: 'warning',
          message: 'Warning 1',
          source: 'ts',
        },
        {
          filePath: 'b.ts',
          line: 2,
          column: 1,
          severity: 'error',
          message: 'Error 1',
          source: 'ts',
        },
        {
          filePath: 'c.ts',
          line: 3,
          column: 1,
          severity: 'warning',
          message: 'Warning 2',
          source: 'ts',
        },
        {
          filePath: 'd.ts',
          line: 4,
          column: 1,
          severity: 'error',
          message: 'Error 2',
          source: 'ts',
        },
      ];

      const filtered = filterDiagnostics(diagnostics);

      expect(filtered[0]?.severity).toBe('error');
      expect(filtered[1]?.severity).toBe('error');
    });

    it('should include warnings after errors', () => {
      const diagnostics: Diagnostic[] = [
        {
          filePath: 'a.ts',
          line: 1,
          column: 1,
          severity: 'warning',
          message: 'Warning 1',
          source: 'ts',
        },
        {
          filePath: 'b.ts',
          line: 2,
          column: 1,
          severity: 'error',
          message: 'Error 1',
          source: 'ts',
        },
      ];

      const filtered = filterDiagnostics(diagnostics);

      expect(filtered.length).toBe(2);
      expect(filtered[0]?.severity).toBe('error');
      expect(filtered[1]?.severity).toBe('warning');
    });

    it('should handle info and hint severity levels', () => {
      const diagnostics: Diagnostic[] = [
        { filePath: 'a.ts', line: 1, column: 1, severity: 'hint', message: 'Hint', source: 'ts' },
        { filePath: 'b.ts', line: 2, column: 1, severity: 'info', message: 'Info', source: 'ts' },
        { filePath: 'c.ts', line: 3, column: 1, severity: 'error', message: 'Error', source: 'ts' },
      ];

      const filtered = filterDiagnostics(diagnostics);

      expect(filtered[0]?.severity).toBe('error');
    });
  });

  describe('T092: filterDiagnostics - limits to 5 most relevant', () => {
    it('should limit results to 5 diagnostics', () => {
      const diagnostics: Diagnostic[] = Array.from({ length: 10 }, (_, i) => ({
        filePath: `file${i}.ts`,
        line: i + 1,
        column: 1,
        severity: 'error' as const,
        message: `Error ${i}`,
        source: 'ts',
      }));

      const filtered = filterDiagnostics(diagnostics);

      expect(filtered.length).toBe(5);
    });

    it('should keep most relevant diagnostics when limiting', () => {
      const diagnostics: Diagnostic[] = [
        ...Array.from({ length: 3 }, (_, i) => ({
          filePath: `error${i}.ts`,
          line: i + 1,
          column: 1,
          severity: 'error' as const,
          message: `Error ${i}`,
          source: 'ts',
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          filePath: `warning${i}.ts`,
          line: i + 1,
          column: 1,
          severity: 'warning' as const,
          message: `Warning ${i}`,
          source: 'ts',
        })),
      ];

      const filtered = filterDiagnostics(diagnostics);

      // Should have all 3 errors and 2 warnings to make 5
      const errorCount = filtered.filter((d) => d.severity === 'error').length;
      expect(errorCount).toBe(3);
      expect(filtered.length).toBe(5);
    });
  });

  describe('T093: matchDiagnosticsToPrompt - matches file paths to keywords', () => {
    it('should prioritize diagnostics matching prompt keywords', () => {
      const diagnostics: Diagnostic[] = [
        {
          filePath: 'src/utils/helper.ts',
          line: 1,
          column: 1,
          severity: 'error',
          message: 'Error 1',
          source: 'ts',
        },
        {
          filePath: 'src/auth/login.ts',
          line: 2,
          column: 1,
          severity: 'error',
          message: 'Error 2',
          source: 'ts',
        },
        {
          filePath: 'src/api/users.ts',
          line: 3,
          column: 1,
          severity: 'error',
          message: 'Error 3',
          source: 'ts',
        },
      ];

      const matched = matchDiagnosticsToPrompt(diagnostics, 'fix the authentication login bug');

      expect(matched[0]?.filePath).toContain('auth');
    });

    it('should return all diagnostics if no keywords match', () => {
      const diagnostics: Diagnostic[] = [
        {
          filePath: 'src/utils.ts',
          line: 1,
          column: 1,
          severity: 'error',
          message: 'Error',
          source: 'ts',
        },
      ];

      const matched = matchDiagnosticsToPrompt(diagnostics, 'do something');

      expect(matched.length).toBe(1);
    });

    it('should handle multiple keyword matches', () => {
      const diagnostics: Diagnostic[] = [
        {
          filePath: 'src/auth/login.ts',
          line: 1,
          column: 1,
          severity: 'error',
          message: 'Auth error',
          source: 'ts',
        },
        {
          filePath: 'src/api/auth.ts',
          line: 2,
          column: 1,
          severity: 'error',
          message: 'API auth error',
          source: 'ts',
        },
      ];

      const matched = matchDiagnosticsToPrompt(diagnostics, 'fix auth api issue');

      // Both should match, api/auth.ts matches both keywords
      expect(matched.length).toBe(2);
    });
  });

  describe('T094: formatLspContext - includes file path, line, message', () => {
    it('should format diagnostic with all details', () => {
      const context: LspContext = {
        diagnostics: [
          {
            filePath: 'src/auth.ts',
            line: 42,
            column: 10,
            severity: 'error',
            message: 'Type error: string is not assignable',
            source: 'typescript',
          },
        ],
      };

      const formatted = formatLspContext(context);

      expect(formatted).toContain('src/auth.ts');
      expect(formatted).toContain('42');
      expect(formatted).toContain('Type error');
    });

    it('should include severity in output', () => {
      const context: LspContext = {
        diagnostics: [
          {
            filePath: 'a.ts',
            line: 1,
            column: 1,
            severity: 'error',
            message: 'Error msg',
            source: 'ts',
          },
          {
            filePath: 'b.ts',
            line: 2,
            column: 1,
            severity: 'warning',
            message: 'Warning msg',
            source: 'ts',
          },
        ],
      };

      const formatted = formatLspContext(context);

      expect(formatted).toContain('error');
      expect(formatted).toContain('warning');
    });

    it('should handle empty diagnostics', () => {
      const context: LspContext = { diagnostics: [] };

      const formatted = formatLspContext(context);

      expect(formatted).toBe('');
    });
  });

  describe('T095: gatherLspDiagnostics - skips if LSP not configured', () => {
    it('should skip when MCP is not available', async () => {
      const result = await gatherLspDiagnostics({
        lspAvailable: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('lsp_not_configured');
    });

    it('should return gracefully without error', async () => {
      const result = await gatherLspDiagnostics({
        lspAvailable: false,
      });

      expect(result.error).toBeUndefined();
    });
  });

  describe('T096: gatherLspDiagnostics - skips if disabled', () => {
    it('should skip when enabled=false', async () => {
      const result = await gatherLspDiagnostics({
        enabled: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('disabled');
    });

    it('should not call MCP when disabled', async () => {
      let mcpCalled = false;
      await gatherLspDiagnostics({
        enabled: false,
        _mockMcpCall: async () => {
          mcpCalled = true;
          return { diagnostics: [] };
        },
      });

      expect(mcpCalled).toBe(false);
    });
  });

  describe('T097: isDebuggingPrompt - detects debugging-related prompts', () => {
    it('should detect error-related keywords', () => {
      expect(isDebuggingPrompt('fix the error in auth.ts')).toBe(true);
      expect(isDebuggingPrompt('why is this failing')).toBe(true);
      expect(isDebuggingPrompt('debug the login issue')).toBe(true);
    });

    it('should detect bug-related keywords', () => {
      expect(isDebuggingPrompt('there is a bug in the code')).toBe(true);
      expect(isDebuggingPrompt('fix this bug please')).toBe(true);
    });

    it('should detect type error keywords', () => {
      expect(isDebuggingPrompt('I have a type error')).toBe(true);
      expect(isDebuggingPrompt('typescript is complaining')).toBe(true);
    });

    it('should return false for non-debugging prompts', () => {
      expect(isDebuggingPrompt('add a new feature')).toBe(false);
      expect(isDebuggingPrompt('refactor the code')).toBe(false);
      expect(isDebuggingPrompt('write documentation')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isDebuggingPrompt('FIX THE ERROR')).toBe(true);
      expect(isDebuggingPrompt('Debug This Issue')).toBe(true);
    });
  });

  describe('gatherLspDiagnostics - full integration', () => {
    it('should gather and filter diagnostics for debugging prompt', async () => {
      const mockDiagnostics: Diagnostic[] = [
        {
          filePath: 'src/auth.ts',
          line: 10,
          column: 1,
          severity: 'error',
          message: 'Auth error',
          source: 'ts',
        },
        {
          filePath: 'src/utils.ts',
          line: 20,
          column: 1,
          severity: 'warning',
          message: 'Unused var',
          source: 'ts',
        },
      ];

      const result = await gatherLspDiagnostics({
        prompt: 'fix the authentication error',
        _mockMcpCall: async () => ({ diagnostics: mockDiagnostics }),
      });

      expect(result.success).toBe(true);
      expect(result.context?.diagnostics.length).toBeGreaterThan(0);
    });

    it('should skip for non-debugging prompts when strictMode enabled', async () => {
      const result = await gatherLspDiagnostics({
        prompt: 'add a new button',
        strictDebuggingOnly: true,
        _mockMcpCall: async () => ({ diagnostics: [] }),
      });

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('not_debugging_prompt');
    });
  });

  describe('parseTscOutput - regex edge cases', () => {
    it('should parse standard tsc error output', () => {
      const output = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.filePath).toBe('src/index.ts');
      expect(result[0]!.line).toBe(10);
      expect(result[0]!.column).toBe(5);
      expect(result[0]!.severity).toBe('error');
      expect(result[0]!.message).toBe("Type 'string' is not assignable to type 'number'.");
    });

    it('should parse warnings', () => {
      const output = `lib/utils.ts(1,1): warning TS6133: 'x' is declared but its value is never read.`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.severity).toBe('warning');
    });

    it('should handle paths with spaces', () => {
      const output = `src/my file.ts(5,3): error TS1234: Some error`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.filePath).toBe('src/my file.ts');
    });

    it('should handle paths with parentheses in directory names', () => {
      const output = `src/(components)/Button.ts(15,10): error TS2345: Argument error`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.filePath).toBe('src/(components)/Button.ts');
    });

    it('should handle multiple diagnostics', () => {
      const output = `src/a.ts(1,1): error TS1001: Error one
src/b.ts(2,2): error TS1002: Error two
src/c.ts(3,3): warning TS1003: Warning three`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(3);
    });

    it('should skip non-diagnostic lines', () => {
      const output = `Starting compilation...
src/index.ts(10,5): error TS2322: Type error
Compilation finished.`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty input', () => {
      expect(parseTscOutput('')).toEqual([]);
      expect(parseTscOutput('\n\n')).toEqual([]);
    });

    it('should handle messages with colons', () => {
      const output = `src/index.ts(1,1): error TS2322: Type: 'A' is not: assignable to: 'B'.`;
      const result = parseTscOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]!.message).toBe("Type: 'A' is not: assignable to: 'B'.");
    });
  });
});

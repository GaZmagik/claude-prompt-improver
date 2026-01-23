/**
 * LSP diagnostics integration for enriching prompts with errors/warnings
 * Gathers diagnostics from TypeScript compiler and filters for relevance
 *
 * Performance: Runs tsc with 5-second timeout to prevent blocking the hook
 * Note: MCP tools (mcp__ide__getDiagnostics) are not accessible from hooks
 * since hooks run as external processes. We use tsc subprocess instead.
 *
 * Security: Uses process.cwd() which is set by Claude Code to the project
 * directory. Hooks cannot run outside their designated project context.
 */

/** Maximum number of diagnostics to include */
const MAX_DIAGNOSTICS = 5;

/** Timeout for tsc execution in milliseconds */
const TSC_TIMEOUT_MS = 5000;

/** Cache TTL for tsc results in milliseconds (30 seconds) */
const TSC_CACHE_TTL_MS = 30000;

/** Cached tsc results to avoid repeated executions */
let tscCache: {
  diagnostics: Diagnostic[];
  timestamp: number;
  cwd: string;
} | null = null;

/** Keywords that indicate a debugging-related prompt */
const DEBUGGING_KEYWORDS = [
  'error',
  'bug',
  'fix',
  'issue',
  'problem',
  'failing',
  'fail',
  'broken',
  'debug',
  'crash',
  'exception',
  'type error',
  'typescript',
  'compile',
  'lint',
  'warning',
  'not working',
  "doesn't work",
  "won't work",
];

/**
 * Diagnostic severity levels
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Single diagnostic from LSP
 */
export interface Diagnostic {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source: string;
}

/**
 * LSP context containing diagnostics
 */
export interface LspContext {
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Options for gathering LSP diagnostics
 */
export interface LspDiagnosticsOptions {
  readonly prompt?: string;
  readonly enabled?: boolean;
  readonly lspAvailable?: boolean;
  readonly strictDebuggingOnly?: boolean;
  /** For testing - mock the MCP call */
  readonly _mockMcpCall?: () => Promise<{ diagnostics: Diagnostic[] }>;
}

/**
 * Result of gathering LSP diagnostics
 */
export interface LspDiagnosticsResult {
  readonly success: boolean;
  readonly context?: LspContext;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly skipReason?: 'disabled' | 'lsp_not_configured' | 'not_debugging_prompt' | 'timeout';
}

/**
 * Parses tsc output into Diagnostic objects
 * Exported for testability - handles edge cases in tsc output format
 *
 * Expected format: file(line,col): severity TS####: message
 * Examples:
 *   src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
 *   lib/utils.ts(1,1): warning TS6133: 'x' is declared but its value is never read.
 */
export function parseTscOutput(stdout: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = stdout.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    // Match: file(line,col): severity TS####: message
    // Use non-greedy match for file path to handle paths with special chars
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/);
    if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
      diagnostics.push({
        filePath: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] as DiagnosticSeverity,
        message: match[5].trim(),
        source: 'typescript',
      });
    }
  }

  return diagnostics;
}

/**
 * Gathers TypeScript diagnostics by running tsc --noEmit
 * Falls back gracefully if tsc is not available or fails
 * Results are cached for TSC_CACHE_TTL_MS to avoid repeated executions
 */
async function gatherTypeScriptDiagnostics(): Promise<Diagnostic[]> {
  const cwd = process.cwd();

  // Check cache - return cached results if still valid and same directory
  if (tscCache && tscCache.cwd === cwd) {
    const age = Date.now() - tscCache.timestamp;
    if (age < TSC_CACHE_TTL_MS) {
      return tscCache.diagnostics;
    }
  }

  try {
    // Try to run tsc with JSON output
    const proc = Bun.spawn(['npx', 'tsc', '--noEmit', '--pretty', 'false'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd,
    });

    // Set a timeout to avoid hanging
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        proc.kill();
        resolve(null);
      }, TSC_TIMEOUT_MS);
    });

    const exitPromise = proc.exited.then(async (exitCode) => {
      // tsc returns non-zero when there are errors, which is expected
      const stdout = await new Response(proc.stdout).text();
      return { exitCode, stdout };
    });

    const result = await Promise.race([exitPromise, timeoutPromise]);

    if (result === null) {
      // Timeout - return empty
      return [];
    }

    const { stdout } = result;

    // Parse tsc output using extracted helper
    const diagnostics = parseTscOutput(stdout);

    // Update cache with results
    tscCache = {
      diagnostics,
      timestamp: Date.now(),
      cwd,
    };

    return diagnostics;
  } catch {
    // If tsc fails or isn't available, return empty array
    // This is expected in non-TypeScript projects
    return [];
  }
}

/**
 * Checks if a prompt is debugging-related
 */
export function isDebuggingPrompt(prompt: string): boolean {
  const promptLower = prompt.toLowerCase();
  return DEBUGGING_KEYWORDS.some((keyword) => promptLower.includes(keyword));
}

/**
 * Filters diagnostics by severity (errors first, then warnings)
 * and limits to MAX_DIAGNOSTICS
 */
export function filterDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  // Sort by severity: error > warning > info > hint
  const severityOrder: Record<DiagnosticSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
    hint: 3,
  };

  const sorted = [...diagnostics].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return sorted.slice(0, MAX_DIAGNOSTICS);
}

/**
 * Matches diagnostics to prompt keywords and prioritises relevant ones
 */
export function matchDiagnosticsToPrompt(diagnostics: Diagnostic[], prompt: string): Diagnostic[] {
  const promptLower = prompt.toLowerCase();
  const words = promptLower.split(/\s+/).filter((w) => w.length > 2);

  // Score each diagnostic by how many prompt keywords match its file path or message
  const scored = diagnostics.map((d) => {
    const pathLower = d.filePath.toLowerCase();
    const messageLower = d.message.toLowerCase();

    let score = 0;
    for (const word of words) {
      if (pathLower.includes(word)) score += 2;
      if (messageLower.includes(word)) score += 1;
    }

    return { diagnostic: d, score };
  });

  // Sort by score descending, then by severity
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const severityOrder: Record<DiagnosticSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
      hint: 3,
    };
    return severityOrder[a.diagnostic.severity] - severityOrder[b.diagnostic.severity];
  });

  return scored.map((s) => s.diagnostic);
}

/**
 * Gathers LSP diagnostics from the IDE
 */
export async function gatherLspDiagnostics(
  options: LspDiagnosticsOptions
): Promise<LspDiagnosticsResult> {
  const {
    prompt,
    enabled = true,
    lspAvailable = true,
    strictDebuggingOnly = false,
    _mockMcpCall,
  } = options;

  // Check if disabled
  if (!enabled) {
    return {
      success: false,
      skipped: true,
      skipReason: 'disabled',
    };
  }

  // Check if LSP is available
  if (!lspAvailable) {
    return {
      success: false,
      skipped: true,
      skipReason: 'lsp_not_configured',
    };
  }

  // Check if debugging-related (when strictDebuggingOnly is enabled)
  if (strictDebuggingOnly && prompt && !isDebuggingPrompt(prompt)) {
    return {
      success: false,
      skipped: true,
      skipReason: 'not_debugging_prompt',
    };
  }

  // Gather diagnostics via MCP mock or real TypeScript compiler
  let diagnostics: Diagnostic[];

  if (_mockMcpCall) {
    const result = await _mockMcpCall();
    diagnostics = result.diagnostics;
  } else {
    // Get real diagnostics from TypeScript compiler
    // Note: MCP tools (mcp__ide__getDiagnostics) are not accessible from hooks
    // since hooks run as external processes. We shell out to tsc instead.
    diagnostics = await gatherTypeScriptDiagnostics();
  }

  // Filter and prioritise diagnostics
  let filtered = filterDiagnostics(diagnostics);

  // If prompt is provided, match to keywords
  if (prompt) {
    filtered = matchDiagnosticsToPrompt(filtered, prompt);
    filtered = filtered.slice(0, MAX_DIAGNOSTICS);
  }

  return {
    success: true,
    context: {
      diagnostics: filtered,
    },
  };
}

/**
 * Formats LSP context for injection into improvement prompt
 */
export function formatLspContext(context: LspContext): string {
  if (context.diagnostics.length === 0) {
    return '';
  }

  const lines = context.diagnostics.map((d) => {
    return `[${d.severity}] ${d.filePath}:${d.line}:${d.column} - ${d.message}`;
  });

  return lines.join('\n');
}

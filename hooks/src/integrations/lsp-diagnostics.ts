/**
 * LSP diagnostics integration for enriching prompts with errors/warnings
 * Gathers diagnostics from IDE via MCP and filters for relevance
 */

/** Maximum number of diagnostics to include */
const MAX_DIAGNOSTICS = 5;

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

  // Gather diagnostics via MCP or mock
  let diagnostics: Diagnostic[];

  if (_mockMcpCall) {
    const result = await _mockMcpCall();
    diagnostics = result.diagnostics;
  } else {
    // In real implementation, this would call mcp__ide__getDiagnostics
    // For now, return empty diagnostics when no mock is provided
    diagnostics = [];
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

/**
 * Resource Formatter - Detects project context and formats as XML for prompt improvement
 * Provides language detection, Speckit status checking, and XML formatting for discovered resources
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeckitStatus {
  readonly hasSpec: boolean;
  readonly hasPlan: boolean;
  readonly hasTasks: boolean;
}

export interface PluginSummary {
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

export interface McpServerSummary {
  readonly name: string;
  readonly type: 'sse' | 'stdio' | 'http';
  readonly description?: string;
}

export interface ResourceContext {
  readonly language: string | null;
  readonly speckitStatus: SpeckitStatus;
  readonly plugins: readonly PluginSummary[];
  readonly mcpServers: readonly McpServerSummary[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Language Detection
// ─────────────────────────────────────────────────────────────────────────────

/** Language indicator files in priority order */
const LANGUAGE_INDICATORS: ReadonlyArray<{ file: string; language: string }> = [
  { file: 'tsconfig.json', language: 'typescript' },
  { file: 'Cargo.toml', language: 'rust' },
  { file: 'pyproject.toml', language: 'python' },
  { file: 'go.mod', language: 'go' },
  { file: 'package.json', language: 'nodejs' },
];

/**
 * Detects the primary programming language of a project
 * Checks for common configuration files in priority order
 * @param cwd - Directory to check
 * @returns Detected language or null if none found
 */
export function detectLanguage(cwd: string): string | null {
  if (!existsSync(cwd)) return null;

  for (const { file, language } of LANGUAGE_INDICATORS) {
    if (existsSync(join(cwd, file))) {
      return language;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Speckit Status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks the Speckit SDD status for a project
 * Looks for spec.md, plan.md, and tasks.md in the .specify/ directory
 * @param cwd - Directory to check
 * @returns Status of each Speckit file
 */
export function checkSpeckitStatus(cwd: string): SpeckitStatus {
  const specifyDir = join(cwd, '.specify');

  if (!existsSync(specifyDir)) {
    return { hasSpec: false, hasPlan: false, hasTasks: false };
  }

  return {
    hasSpec: existsSync(join(specifyDir, 'spec.md')),
    hasPlan: existsSync(join(specifyDir, 'plan.md')),
    hasTasks: existsSync(join(specifyDir, 'tasks.md')),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XML Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escapes special XML characters in a string
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a ResourceContext as XML for prompt injection
 * Includes language, Speckit status, plugins, and MCP servers
 * @param context - The resource context to format
 * @returns Formatted XML string
 */
export function formatResourcesXml(context: ResourceContext): string {
  const lines: string[] = ['<project-context>'];

  // Language section (optional)
  if (context.language) {
    lines.push(`  <language>${escapeXml(context.language)}</language>`);
  }

  // Speckit status (always included)
  const { hasSpec, hasPlan, hasTasks } = context.speckitStatus;
  lines.push(`  <speckit-status spec="${hasSpec}" plan="${hasPlan}" tasks="${hasTasks}" />`);

  // Plugins section (optional)
  if (context.plugins.length > 0) {
    lines.push('  <plugins>');
    for (const plugin of context.plugins) {
      const desc = plugin.description ? ` description="${escapeXml(plugin.description)}"` : '';
      lines.push(`    <plugin name="${escapeXml(plugin.name)}" version="${escapeXml(plugin.version)}"${desc} />`);
    }
    lines.push('  </plugins>');
  }

  // MCP servers section (optional)
  if (context.mcpServers.length > 0) {
    lines.push('  <mcp-servers>');
    for (const server of context.mcpServers) {
      const desc = server.description ? ` description="${escapeXml(server.description)}"` : '';
      lines.push(`    <server name="${escapeXml(server.name)}" type="${server.type}"${desc} />`);
    }
    lines.push('  </mcp-servers>');
  }

  lines.push('</project-context>');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Gathering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gathers complete resource context for a project directory
 * Combines language detection, Speckit status, and discovered plugins/servers
 * @param cwd - Directory to analyse
 * @param plugins - Pre-scanned plugins (from scanEnhancePlugins)
 * @param mcpServers - Pre-scanned MCP servers (from scanMcpServers)
 * @returns Complete resource context
 */
export function gatherResourceContext(
  cwd: string,
  plugins: readonly PluginSummary[],
  mcpServers: readonly McpServerSummary[]
): ResourceContext {
  return {
    language: detectLanguage(cwd),
    speckitStatus: checkSpeckitStatus(cwd),
    plugins,
    mcpServers,
  };
}

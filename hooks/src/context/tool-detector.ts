/**
 * Tool detector for parsing available tools from hook stdin
 * Provides context about what tools are available in the session
 */

/** Core Claude Code tools */
export const CORE_TOOLS = ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'] as const;

/**
 * Result of tool detection
 */
export interface DetectedTools {
  readonly tools: readonly string[];
  readonly coreTools: readonly string[];
  readonly mcpTools: readonly string[];
  readonly count: number;
  readonly hasRead: boolean;
  readonly hasWrite: boolean;
  readonly hasEdit: boolean;
  readonly hasGrep: boolean;
  readonly hasGlob: boolean;
  readonly hasBash: boolean;
}

/**
 * Checks if a tool name is an MCP tool
 */
function isMcpTool(toolName: string): boolean {
  return toolName.startsWith('mcp__');
}

/**
 * Detects and categorises available tools
 */
export function detectTools(availableTools: readonly string[] | undefined): DetectedTools {
  if (!availableTools || !Array.isArray(availableTools)) {
    return {
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
  }

  const coreTools = availableTools.filter((t) =>
    CORE_TOOLS.includes(t as (typeof CORE_TOOLS)[number])
  );
  const mcpTools = availableTools.filter(isMcpTool);

  return {
    tools: availableTools,
    coreTools,
    mcpTools,
    count: availableTools.length,
    hasRead: availableTools.includes('Read'),
    hasWrite: availableTools.includes('Write'),
    hasEdit: availableTools.includes('Edit'),
    hasGrep: availableTools.includes('Grep'),
    hasGlob: availableTools.includes('Glob'),
    hasBash: availableTools.includes('Bash'),
  };
}

/**
 * Formats detected tools as context string for prompt injection
 */
export function formatToolsContext(detected: DetectedTools): string {
  if (detected.count === 0) {
    return '';
  }

  const parts: string[] = [];

  if (detected.coreTools.length > 0) {
    parts.push(`Core tools: ${detected.coreTools.join(', ')}`);
  }

  if (detected.mcpTools.length > 0) {
    parts.push(`MCP tools: ${detected.mcpTools.join(', ')}`);
  }

  return parts.join('\n');
}

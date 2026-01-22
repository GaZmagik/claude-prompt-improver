// Timeout constants no longer needed - using model-based timeouts
/**
 * Prompt improver for enhancing user prompts
 * Uses config-driven model selection for all improvements
 */
import type { ClaudeModel, Configuration, ContextSource } from '../core/types.ts';
import { escapeXmlContent } from '../utils/xml-builder.ts';
import { executeClaudeCommand } from './claude-client.ts';

/**
 * Context gathered from various sources
 */
export interface ImprovementContext {
  readonly git?: string;
  readonly lsp?: string;
  readonly spec?: string;
  readonly tools?: string;
  readonly skills?: string;
  readonly agents?: string;
  readonly memory?: string;
  readonly session?: string;
  readonly dynamicDiscovery?: string;
}

/**
 * Options for improving a prompt
 */
export interface ImprovePromptOptions {
  readonly originalPrompt: string;
  readonly sessionId: string;
  readonly config: Configuration;
  readonly context?: ImprovementContext;
  /** Project directory - required for fork-session to find session files */
  readonly cwd?: string;
  /** For testing - mock the Claude response */
  readonly _mockClaudeResponse?: string | null;
}

/**
 * Result of improving a prompt
 */
export interface ImprovementResult {
  readonly success: boolean;
  readonly improvedPrompt: string;
  readonly fallbackToOriginal: boolean;
  readonly modelUsed: ClaudeModel;
  readonly latencyMs: number;
  readonly contextSources: readonly ContextSource[];
  readonly summary?: readonly string[];
  /** Error message when improvement fails (for debugging) */
  readonly error?: string;
}

/**
 * Returns the appropriate timeout for the model
 */
function getTimeoutForModel(model: ClaudeModel): number {
  switch (model) {
    case 'opus': return 90_000;  // 90s
    case 'sonnet': return 60_000; // 60s
    case 'haiku': return 30_000;  // 30s
  }
}

/**
 * Extracts context sources that were provided
 */
function getContextSources(context?: ImprovementContext): ContextSource[] {
  if (!context) return [];

  const sources: ContextSource[] = [];
  if (context.git) sources.push('git');
  if (context.lsp) sources.push('lsp');
  if (context.spec) sources.push('spec');
  if (context.tools) sources.push('tools');
  if (context.skills) sources.push('skills');
  if (context.agents) sources.push('agents');
  if (context.memory) sources.push('memory');
  if (context.session) sources.push('session');
  if (context.dynamicDiscovery) sources.push('dynamicDiscovery');

  return sources;
}

/**
 * Generate improvement summary by detecting changes
 * Returns max 3 bullets describing what changed
 */
export function generateImprovementSummary(
  originalPrompt: string,
  improvedPrompt: string
): readonly string[] {
  const changes: string[] = [];

  // Detect XML structuring added
  const hasXmlTags = /<(task|context|constraints|output_format|examples)>/.test(improvedPrompt);
  const originalHasXmlTags = /<(task|context|constraints|output_format|examples)>/.test(
    originalPrompt
  );
  if (hasXmlTags && !originalHasXmlTags) {
    changes.push('Added XML structure');
  }

  // Detect context injection (both specific and generic context tags)
  const hasContextTags =
    /<(context|git_context|lsp_diagnostics|specification|available_tools|available_skills|suggested_agents|relevant_memories|session_context)>/.test(
      improvedPrompt
    );
  const originalHasContextTags =
    /<(context|git_context|lsp_diagnostics|specification|available_tools|available_skills|suggested_agents|relevant_memories|session_context)>/.test(
      originalPrompt
    );
  if (hasContextTags && !originalHasContextTags) {
    changes.push('Injected context');
  }

  // Detect expansion (>20% token increase)
  // Threshold: 20% ensures we only flag significant expansions while allowing
  // minor additions like XML tags or context injections without triggering
  const originalTokens = originalPrompt.split(/\s+/).length;
  const improvedTokens = improvedPrompt.split(/\s+/).length;
  const growthPercent = ((improvedTokens - originalTokens) / originalTokens) * 100;
  if (growthPercent > 20) {
    changes.push('Expanded with detail');
  }

  // Return max 3 bullets, or fallback if no specific changes detected
  // Limit: 3 bullets keeps the summary concise and readable in terminal output
  if (changes.length === 0) {
    return ['Enhanced clarity'];
  }

  return changes.slice(0, 3);
}

/**
 * Builds context section for improvement prompt
 * Context values are escaped to prevent XML injection
 */
function buildContextSection(context?: ImprovementContext): string {
  if (!context) return '';

  const sections: string[] = [];

  // Escape all context values to prevent XML/prompt injection
  if (context.git) {
    sections.push(`<git_context>\n${escapeXmlContent(context.git)}\n</git_context>`);
  }
  if (context.lsp) {
    sections.push(`<lsp_diagnostics>\n${escapeXmlContent(context.lsp)}\n</lsp_diagnostics>`);
  }
  if (context.spec) {
    sections.push(`<specification>\n${escapeXmlContent(context.spec)}\n</specification>`);
  }
  if (context.tools) {
    sections.push(`<available_tools>\n${escapeXmlContent(context.tools)}\n</available_tools>`);
  }
  if (context.skills) {
    sections.push(`<available_skills>\n${escapeXmlContent(context.skills)}\n</available_skills>`);
  }
  if (context.agents) {
    sections.push(`<suggested_agents>\n${escapeXmlContent(context.agents)}\n</suggested_agents>`);
  }
  if (context.memory) {
    sections.push(`<relevant_memories>\n${escapeXmlContent(context.memory)}\n</relevant_memories>`);
  }
  if (context.session) {
    sections.push(`<session_context>\n${escapeXmlContent(context.session)}\n</session_context>`);
  }
  if (context.dynamicDiscovery) {
    sections.push(`<discovered_resources>\n${escapeXmlContent(context.dynamicDiscovery)}\n</discovered_resources>`);
  }

  return sections.length > 0 ? sections.join('\n\n') : '';
}

/**
 * Improvement prompt template
 *
 * CRITICAL: This prompt runs in a FORKED SESSION with full conversation history visible.
 * The framing must clearly distinguish this as a one-shot improvement task, NOT a
 * continuation of the previous conversation. Without explicit boundaries, the model
 * may respond to prior conversation context instead of performing the improvement.
 */
const IMPROVEMENT_PROMPT_TEMPLATE = `[FORKED SESSION - PROMPT IMPROVEMENT AGENT]

You are running in a FORKED SESSION as a specialised prompt improvement agent.
You are NOT the assistant from the previous conversation.
Your ONLY task is to output an improved version of the user's prompt.

CRITICAL BOUNDARIES:
- DO NOT continue or respond to the previous conversation
- DO NOT ask questions or request clarification
- DO NOT explain your reasoning or add commentary
- DO NOT reference what was previously discussed
- Output ONLY the improved prompt, nothing else

Original prompt to improve:
<original_prompt>
{ORIGINAL_PROMPT}
</original_prompt>

{CONTEXT_SECTION}

Improvement guidelines:
1. PRESERVE the original intent - the user's goal must remain unchanged
2. PRESERVE the original tone - formal/informal, concise/detailed
3. ADD clarity by specifying what's ambiguous
4. Structure the output using XML tags (e.g., <task>, <context>, <constraints>)
5. Make reasonable assumptions based on available context

Output ONLY the improved prompt wrapped in XML tags. No preamble. No explanation.`;

/**
 * Builds the improvement prompt with context
 * User content is escaped to prevent XML/prompt injection
 */
export function buildImprovementPrompt(options: {
  originalPrompt: string;
  context?: ImprovementContext;
}): string {
  const { originalPrompt, context } = options;
  const contextSection = buildContextSection(context);

  // Escape user prompt to prevent XML/prompt injection
  const escapedPrompt = escapeXmlContent(originalPrompt);

  return IMPROVEMENT_PROMPT_TEMPLATE.replace('{ORIGINAL_PROMPT}', escapedPrompt)
    .replace('{CONTEXT_SECTION}', contextSection ? `Available context:\n${contextSection}` : '');
}

/**
 * Improves a prompt using the config-specified Claude model
 * Falls back to original prompt on any error
 */
export async function improvePrompt(options: ImprovePromptOptions): Promise<ImprovementResult> {
  const { originalPrompt, sessionId, config, context, cwd, _mockClaudeResponse } = options;
  const startTime = Date.now();

  // Get model from config
  const model = config.improverModel;
  const contextSources = getContextSources(context);

  // Handle mock response for testing
  if (_mockClaudeResponse !== undefined) {
    const latencyMs = Date.now() - startTime;

    if (_mockClaudeResponse === null) {
      return {
        success: false,
        improvedPrompt: originalPrompt,
        fallbackToOriginal: true,
        modelUsed: model,
        latencyMs,
        contextSources,
      };
    }

    const summary = generateImprovementSummary(originalPrompt, _mockClaudeResponse);

    return {
      success: true,
      improvedPrompt: _mockClaudeResponse,
      fallbackToOriginal: false,
      modelUsed: model,
      latencyMs,
      contextSources,
      summary,
    };
  }

  // Real improvement via Claude
  const promptOptions = context
    ? { originalPrompt, context }
    : { originalPrompt };
  const improvementPrompt = buildImprovementPrompt(promptOptions);

  const result = await executeClaudeCommand({
    prompt: improvementPrompt,
    model,
    sessionId,
    timeoutMs: getTimeoutForModel(model),
    ...(cwd && { cwd }), // Required for fork-session to find session files
  });

  const latencyMs = Date.now() - startTime;

  if (!result.success || !result.output) {
    return {
      success: false,
      improvedPrompt: originalPrompt,
      fallbackToOriginal: true,
      modelUsed: model,
      latencyMs,
      contextSources,
      error: result.error ?? 'No output from Claude CLI',
    };
  }

  const summary = generateImprovementSummary(originalPrompt, result.output);

  return {
    success: true,
    improvedPrompt: result.output,
    fallbackToOriginal: false,
    modelUsed: model,
    latencyMs,
    contextSources,
    summary,
  };
}

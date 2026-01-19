import {
  COMPLEX_IMPROVEMENT_TIMEOUT_MS,
  SIMPLE_IMPROVEMENT_TIMEOUT_MS,
} from '../core/constants.ts';
/**
 * Prompt improver for enhancing user prompts
 * Uses Haiku for SIMPLE, Sonnet for COMPLEX improvements
 */
import type { ClassificationLevel, ClaudeModel, ContextSource } from '../core/types.ts';
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
}

/**
 * Options for improving a prompt
 */
export interface ImprovePromptOptions {
  readonly originalPrompt: string;
  readonly classification: ClassificationLevel;
  readonly sessionId: string;
  readonly context?: ImprovementContext;
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
}

/**
 * Returns the appropriate model for the classification level
 */
export function getModelForClassification(classification: ClassificationLevel): ClaudeModel {
  return classification === 'COMPLEX' ? 'sonnet' : 'haiku';
}

/**
 * Returns the appropriate timeout for the classification level
 */
export function getTimeoutForClassification(classification: ClassificationLevel): number {
  return classification === 'COMPLEX'
    ? COMPLEX_IMPROVEMENT_TIMEOUT_MS
    : SIMPLE_IMPROVEMENT_TIMEOUT_MS;
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
  const originalTokens = originalPrompt.split(/\s+/).length;
  const improvedTokens = improvedPrompt.split(/\s+/).length;
  const growthPercent = ((improvedTokens - originalTokens) / originalTokens) * 100;
  if (growthPercent > 20) {
    changes.push('Expanded with detail');
  }

  // Return max 3 bullets, or fallback if no specific changes detected
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

  return sections.length > 0 ? sections.join('\n\n') : '';
}

/**
 * Improvement prompt template
 */
const IMPROVEMENT_PROMPT_TEMPLATE = `You are improving a user prompt for Claude Code.

Classification: {CLASSIFICATION}

Original prompt:
<original_prompt>
{ORIGINAL_PROMPT}
</original_prompt>

{CONTEXT_SECTION}

Instructions:
1. PRESERVE the original intent - the user's goal must remain unchanged
2. PRESERVE the original tone - formal/informal, concise/detailed
3. ADD clarity by specifying what's ambiguous
4. ADD structure using XML tags if helpful for complex prompts
5. SUGGEST clarifying questions if the prompt is very vague
6. REFERENCE the provided context where relevant

Output ONLY the improved prompt, nothing else.`;

/**
 * Builds the improvement prompt with context
 * User content is escaped to prevent XML/prompt injection
 */
export function buildImprovementPrompt(options: {
  originalPrompt: string;
  classification: ClassificationLevel;
  context?: ImprovementContext;
}): string {
  const { originalPrompt, classification, context } = options;
  const contextSection = buildContextSection(context);

  // Escape user prompt to prevent XML/prompt injection
  const escapedPrompt = escapeXmlContent(originalPrompt);

  return IMPROVEMENT_PROMPT_TEMPLATE.replace('{CLASSIFICATION}', classification)
    .replace('{ORIGINAL_PROMPT}', escapedPrompt)
    .replace('{CONTEXT_SECTION}', contextSection ? `Available context:\n${contextSection}` : '');
}

/**
 * Improves a prompt using the appropriate Claude model
 * Falls back to original prompt on any error
 */
export async function improvePrompt(options: ImprovePromptOptions): Promise<ImprovementResult> {
  const { originalPrompt, classification, sessionId, context, _mockClaudeResponse } = options;
  const startTime = Date.now();
  const model = getModelForClassification(classification);
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
    ? { originalPrompt, classification, context }
    : { originalPrompt, classification };
  const improvementPrompt = buildImprovementPrompt(promptOptions);

  const result = await executeClaudeCommand({
    prompt: improvementPrompt,
    model,
    sessionId,
    timeoutMs: getTimeoutForClassification(classification),
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

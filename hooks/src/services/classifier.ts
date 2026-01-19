/**
 * Prompt classifier for determining improvement strategy
 * Uses Haiku for cost-effective classification
 */
import type { ClassificationLevel } from '../core/types.ts';
import { CLASSIFICATION_TIMEOUT_MS } from '../core/constants.ts';
import { executeClaudeCommand } from './claude-client.ts';

/**
 * Result of classifying a prompt
 */
export interface ClassificationResult {
  readonly level: ClassificationLevel;
  readonly reasoning: string;
  readonly latencyMs: number;
}

/**
 * Options for classifying a prompt
 */
export interface ClassifyPromptOptions {
  readonly prompt: string;
  readonly sessionId: string;
  /** For testing - mock the Claude response */
  readonly _mockClaudeResponse?: string | null;
}

/**
 * Classification prompt template per research.md Decision 1
 */
const CLASSIFICATION_PROMPT_TEMPLATE = `Classify this user prompt into ONE category:

- NONE: Well-structured, clear, specific. No improvement needed.
  Examples: "Read src/auth.ts and explain the JWT validation" (has specific file, clear action)

- SIMPLE: Moderately unclear, could benefit from minor clarification.
  Examples: "help with testing", "check the database code" (vague scope but clear intent)

- COMPLEX: Vague, multi-faceted, requires significant restructuring.
  Examples: "fix the bug", "make it better" (no specifics, multiple interpretations)

User prompt to classify:
<prompt>
{PROMPT}
</prompt>

Respond with EXACTLY this format:
LEVEL: reasoning

Example: COMPLEX: The prompt is vague without specifying which bug or where to look.`;

/**
 * Builds the classification prompt with the user's prompt inserted
 */
export function buildClassificationPrompt(userPrompt: string): string {
  return CLASSIFICATION_PROMPT_TEMPLATE.replace('{PROMPT}', userPrompt);
}

/**
 * Parses Claude's classification response into structured result
 * Defaults to NONE on any parsing failure (fail-safe)
 */
export function parseClassificationResponse(response: string): Omit<ClassificationResult, 'latencyMs'> {
  if (!response || response.trim().length === 0) {
    return {
      level: 'NONE',
      reasoning: 'Classification defaulted to NONE (empty response)',
    };
  }

  const trimmed = response.trim();

  // Try to extract classification level from start of response
  const levelMatch = trimmed.match(/^(NONE|SIMPLE|COMPLEX)[\s:\-]/i);

  if (!levelMatch) {
    // Try looser match anywhere in response
    const looseMatch = trimmed.match(/\b(NONE|SIMPLE|COMPLEX)\b/i);
    if (!looseMatch) {
      return {
        level: 'NONE',
        reasoning: 'Classification defaulted to NONE (unparseable response)',
      };
    }

    const level = looseMatch[1]!.toUpperCase() as ClassificationLevel;
    return {
      level,
      reasoning: trimmed,
    };
  }

  const level = levelMatch[1]!.toUpperCase() as ClassificationLevel;

  // Extract reasoning after the level
  const reasoningStart = trimmed.indexOf(levelMatch[0]!) + levelMatch[0]!.length;
  let reasoning = trimmed.slice(reasoningStart).trim();

  // Remove leading colon or dash if present
  if (reasoning.startsWith(':') || reasoning.startsWith('-')) {
    reasoning = reasoning.slice(1).trim();
  }

  if (!reasoning) {
    reasoning = `Classified as ${level}`;
  }

  return { level, reasoning };
}

/**
 * Classifies a prompt using Claude Haiku
 * Returns NONE on any error (fail-safe for user experience)
 */
export async function classifyPrompt(options: ClassifyPromptOptions): Promise<ClassificationResult> {
  const { prompt, sessionId, _mockClaudeResponse } = options;
  const startTime = Date.now();

  // Handle mock response for testing
  if (_mockClaudeResponse !== undefined) {
    const latencyMs = Date.now() - startTime;

    if (_mockClaudeResponse === null) {
      return {
        level: 'NONE',
        reasoning: 'Classification defaulted to NONE (timeout/error)',
        latencyMs,
      };
    }

    const parsed = parseClassificationResponse(_mockClaudeResponse);
    return { ...parsed, latencyMs };
  }

  // Real classification via Claude
  const classificationPrompt = buildClassificationPrompt(prompt);

  const result = await executeClaudeCommand({
    prompt: classificationPrompt,
    model: 'haiku',
    sessionId,
    timeoutMs: CLASSIFICATION_TIMEOUT_MS,
  });

  const latencyMs = Date.now() - startTime;

  if (!result.success || !result.output) {
    return {
      level: 'NONE',
      reasoning: `Classification defaulted to NONE (${result.error || 'no output'})`,
      latencyMs,
    };
  }

  const parsed = parseClassificationResponse(result.output);
  return { ...parsed, latencyMs };
}

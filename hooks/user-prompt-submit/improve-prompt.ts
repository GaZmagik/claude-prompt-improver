/**
 * UserPromptSubmit hook entry point for Claude Prompt Improver Plugin
 * Handles stdin parsing, orchestration, and stdout output
 */
import type { BypassReason, ClassificationLevel, HookInput, HookOutput } from '../src/core/types.ts';
import { detectBypass, type BypassCheckInput } from '../src/core/bypass-detector.ts';
import { classifyPrompt } from '../src/services/classifier.ts';
import { improvePrompt, type ImprovementContext } from '../src/services/improver.ts';
import { buildContext, formatContextForInjection } from '../src/context/context-builder.ts';
import type { SkillRule } from '../src/context/skill-matcher.ts';
import type { AgentDefinition } from '../src/context/agent-suggester.ts';

/**
 * Result of parsing hook input
 */
export interface ParseResult {
  readonly success: boolean;
  readonly input?: HookInput;
  readonly error?: string;
}

/**
 * Options for creating hook output
 */
export type HookOutputOptions =
  | { type: 'passthrough' }
  | { type: 'improved'; improvedPrompt: string; classification: ClassificationLevel };

/**
 * Parses hook stdin JSON into structured input
 */
export function parseHookInput(stdin: string): ParseResult {
  try {
    const parsed = JSON.parse(stdin) as Record<string, unknown>;

    // Validate required fields
    if (typeof parsed.prompt !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "prompt" field',
      };
    }

    if (!parsed.context || typeof parsed.context !== 'object') {
      return {
        success: false,
        error: 'Missing or invalid "context" field',
      };
    }

    const context = parsed.context as Record<string, unknown>;

    // Validate required context fields
    if (typeof context.conversation_id !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "context.conversation_id" field',
      };
    }

    if (typeof context.message_index !== 'number') {
      return {
        success: false,
        error: 'Missing or invalid "context.message_index" field',
      };
    }

    // Build context object, adding optional fields only when present
    const contextObj: Record<string, unknown> = {
      conversation_id: context.conversation_id,
      message_index: context.message_index,
    };

    if (typeof context.permission_mode === 'string') {
      contextObj.permission_mode = context.permission_mode;
    }
    if (Array.isArray(context.available_tools)) {
      contextObj.available_tools = context.available_tools;
    }
    if (Array.isArray(context.enabled_mcp_servers)) {
      contextObj.enabled_mcp_servers = context.enabled_mcp_servers;
    }
    if (context.context_usage && typeof context.context_usage === 'object') {
      contextObj.context_usage = context.context_usage;
    }
    if (context.session_settings && typeof context.session_settings === 'object') {
      contextObj.session_settings = context.session_settings;
    }

    const input: HookInput = {
      prompt: parsed.prompt,
      context: contextObj as unknown as HookInput['context'],
    };

    return { success: true, input };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

/**
 * Serializes hook output to JSON for stdout
 */
export function serializeHookOutput(output: HookOutput): string {
  // Only include defined fields (avoid undefined in JSON)
  const result: Record<string, unknown> = {};

  if (output.continue !== undefined) {
    result.continue = output.continue;
  }
  if (output.systemMessage !== undefined) {
    result.systemMessage = output.systemMessage;
  }
  if (output.userMessage !== undefined) {
    result.userMessage = output.userMessage;
  }
  if (output.additionalContext !== undefined) {
    result.additionalContext = output.additionalContext;
  }

  return JSON.stringify(result);
}

/**
 * Creates hook output based on processing result
 */
export function createHookOutput(options: HookOutputOptions): HookOutput {
  if (options.type === 'passthrough') {
    return { continue: true };
  }

  // Improved output
  return {
    continue: true,
    systemMessage: `🎯 Prompt improved (${options.classification})`,
    additionalContext: `<improved_prompt>\n${options.improvedPrompt}\n</improved_prompt>`,
  };
}

/**
 * Options for processing a prompt
 */
export interface ProcessPromptOptions {
  readonly prompt: string;
  readonly sessionId: string;
  readonly permissionMode?: string;
  readonly pluginDisabled?: boolean;
  readonly contextUsage?: {
    readonly used: number;
    readonly max: number;
  };
  /** Available tools from hook stdin */
  readonly availableTools?: readonly string[];
  /** Skill rules for matching */
  readonly skillRules?: SkillRule[];
  /** Agent definitions for matching */
  readonly agentDefinitions?: AgentDefinition[];
  /** For testing - mock the classification response */
  readonly _mockClassification?: string | null;
  /** For testing - mock the improvement response */
  readonly _mockImprovement?: string | null;
}

/**
 * Result of processing a prompt
 */
export type ProcessPromptResult =
  | { type: 'passthrough'; bypassReason?: BypassReason }
  | { type: 'improved'; improvedPrompt: string; classification: ClassificationLevel };

/**
 * Processes a prompt through classification and improvement
 * Returns passthrough for NONE classification or on any error
 */
export async function processPrompt(options: ProcessPromptOptions): Promise<ProcessPromptResult> {
  const {
    prompt,
    sessionId,
    permissionMode,
    pluginDisabled,
    contextUsage,
    availableTools,
    skillRules,
    agentDefinitions,
    _mockClassification,
    _mockImprovement,
  } = options;

  // Build bypass check input
  const bypassInput: BypassCheckInput = {
    prompt,
    sessionId,
  };
  if (permissionMode !== undefined) {
    (bypassInput as { permissionMode?: string }).permissionMode = permissionMode;
  }
  if (pluginDisabled !== undefined) {
    (bypassInput as { pluginDisabled?: boolean }).pluginDisabled = pluginDisabled;
  }
  if (contextUsage !== undefined) {
    (bypassInput as { contextUsage?: { used: number; max: number } }).contextUsage = contextUsage;
  }

  // Check for bypass conditions (fast, synchronous check)
  const bypassResult = detectBypass(bypassInput);
  if (bypassResult.shouldBypass) {
    // Only include bypassReason if defined
    return bypassResult.reason
      ? { type: 'passthrough', bypassReason: bypassResult.reason }
      : { type: 'passthrough' };
  }

  // Build classify options, only including mock if defined
  const classifyOptions: Parameters<typeof classifyPrompt>[0] =
    _mockClassification !== undefined
      ? { prompt, sessionId, _mockClaudeResponse: _mockClassification }
      : { prompt, sessionId };

  // Classify the prompt
  const classification = await classifyPrompt(classifyOptions);

  // Passthrough for NONE classification
  if (classification.level === 'NONE') {
    return { type: 'passthrough' };
  }

  // Build context from available sources
  let improvementContext: ImprovementContext | undefined;
  if (availableTools || skillRules || agentDefinitions) {
    const contextInput: Parameters<typeof buildContext>[0] = { prompt };
    if (availableTools) {
      (contextInput as { availableTools?: readonly string[] }).availableTools = availableTools;
    }
    if (skillRules) {
      (contextInput as { skillRules?: SkillRule[] }).skillRules = skillRules;
    }
    if (agentDefinitions) {
      (contextInput as { agentDefinitions?: AgentDefinition[] }).agentDefinitions = agentDefinitions;
    }

    const builtContext = await buildContext(contextInput);
    const formattedContext = formatContextForInjection(builtContext);

    // Only include context if we have something
    if (formattedContext.tools || formattedContext.skills || formattedContext.agents) {
      improvementContext = {};
      if (formattedContext.tools) {
        (improvementContext as { tools?: string }).tools = formattedContext.tools;
      }
      if (formattedContext.skills) {
        (improvementContext as { skills?: string }).skills = formattedContext.skills;
      }
      if (formattedContext.agents) {
        (improvementContext as { agents?: string }).agents = formattedContext.agents;
      }
    }
  }

  // Build improve options, only including mock and context if defined
  const improveOptions: Parameters<typeof improvePrompt>[0] = {
    originalPrompt: prompt,
    classification: classification.level,
    sessionId,
  };
  if (_mockImprovement !== undefined) {
    (improveOptions as { _mockClaudeResponse?: string | null })._mockClaudeResponse = _mockImprovement;
  }
  if (improvementContext) {
    (improveOptions as { context?: ImprovementContext }).context = improvementContext;
  }

  // Improve the prompt
  const improvement = await improvePrompt(improveOptions);

  // On improvement failure, fallback to passthrough
  if (!improvement.success || improvement.fallbackToOriginal) {
    return { type: 'passthrough' };
  }

  return {
    type: 'improved',
    improvedPrompt: improvement.improvedPrompt,
    classification: classification.level,
  };
}

/**
 * Main hook entry point
 * Reads stdin, processes prompt, writes stdout
 */
async function main(): Promise<void> {
  // Read stdin
  const stdin = await Bun.stdin.text();

  // Parse input
  const parseResult = parseHookInput(stdin);

  if (!parseResult.success || !parseResult.input) {
    // Invalid input - passthrough
    const output = createHookOutput({ type: 'passthrough' });
    console.log(serializeHookOutput(output));
    return;
  }

  const { prompt, context } = parseResult.input;

  // Build process options, only including optional fields when defined
  const processOptions: ProcessPromptOptions = {
    prompt,
    sessionId: context.conversation_id,
  };

  if (context.permission_mode) {
    (processOptions as { permissionMode?: string }).permissionMode = context.permission_mode;
  }

  if (context.context_usage) {
    (processOptions as { contextUsage?: { used: number; max: number } }).contextUsage = {
      used: context.context_usage.used,
      max: context.context_usage.max,
    };
  }

  // Process the prompt through classification and improvement
  const result = await processPrompt(processOptions);

  // Create output based on processing result
  const output =
    result.type === 'improved'
      ? createHookOutput({
          type: 'improved',
          improvedPrompt: result.improvedPrompt,
          classification: result.classification,
        })
      : createHookOutput({ type: 'passthrough' });

  console.log(serializeHookOutput(output));
}

// Run if executed directly
if (import.meta.main) {
  main().catch((err) => {
    // On any error, output passthrough to never block prompts
    console.log(JSON.stringify({ continue: true }));
    console.error('Hook error:', err);
    process.exit(0); // Exit cleanly to not block
  });
}

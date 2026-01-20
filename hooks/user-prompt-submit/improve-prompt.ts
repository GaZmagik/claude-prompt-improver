/**
 * UserPromptSubmit hook entry point for Claude Prompt Improver Plugin
 * Handles stdin parsing, orchestration, and stdout output
 */
import type {
  BypassReason,
  ClaudeModel,
  Configuration,
  HookInput,
  HookOutput,
  VisibilityInfo,
} from '../src/core/types.ts';
import { detectBypass, type BypassCheckInput } from '../src/core/bypass-detector.ts';
import { improvePrompt, type ImprovementContext } from '../src/services/improver.ts';
import { buildContext, formatContextForInjection } from '../src/context/context-builder.ts';
import type { SkillRule } from '../src/context/skill-matcher.ts';
import type { AgentDefinition } from '../src/context/agent-suggester.ts';
import { loadConfigFromStandardPaths } from '../src/core/config-loader.ts';
import { formatSystemMessage } from '../src/utils/message-formatter.ts';
import { countTokens } from '../src/utils/token-counter.ts';
import { createLogEntry, writeLogEntry } from '../src/utils/logger.ts';
import { generateLogFilePath } from '../src/utils/logger.ts';

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
  | { type: 'passthrough'; bypassReason?: BypassReason }
  | {
      type: 'improved';
      improvedPrompt: string;
      tokensBefore: number;
      tokensAfter: number;
      summary?: readonly string[];
      latencyMs: number;
      displayImprovedPrompt?: boolean;
    };

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
    // Create bypass visibility info if reason provided
    if (options.bypassReason) {
      const visibilityInfo: VisibilityInfo = {
        status: 'bypassed',
        bypassReason: options.bypassReason,
      };
      return {
        continue: true,
        systemMessage: formatSystemMessage(visibilityInfo),
      };
    }
    return { continue: true };
  }

  // Create applied visibility info
  const visibilityInfo: VisibilityInfo = {
    status: 'applied',
    tokensBefore: options.tokensBefore,
    tokensAfter: options.tokensAfter,
    latencyMs: options.latencyMs,
    ...(options.summary !== undefined && { summary: options.summary }),
    ...(options.displayImprovedPrompt && options.improvedPrompt !== undefined && {
      improvedPrompt: options.improvedPrompt
    }),
  };

  return {
    continue: true,
    systemMessage: formatSystemMessage(visibilityInfo),
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
  readonly forceImprove?: boolean;
  readonly shortPromptThreshold?: number;
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
  | {
      type: 'improved';
      improvedPrompt: string;
      tokensBefore: number;
      tokensAfter: number;
      summary?: readonly string[];
      latencyMs: number;
      modelUsed: ClaudeModel | null;
    };

/**
 * Builds bypass check input from process options
 */
function buildBypassCheckInput(options: ProcessPromptOptions): BypassCheckInput {
  const { prompt, sessionId, permissionMode, pluginDisabled, forceImprove, shortPromptThreshold, contextUsage } = options;

  const bypassInput: BypassCheckInput = { prompt, sessionId };

  if (permissionMode !== undefined) {
    (bypassInput as { permissionMode?: string }).permissionMode = permissionMode;
  }
  if (pluginDisabled !== undefined) {
    (bypassInput as { pluginDisabled?: boolean }).pluginDisabled = pluginDisabled;
  }
  if (forceImprove !== undefined) {
    (bypassInput as { forceImprove?: boolean }).forceImprove = forceImprove;
  }
  if (shortPromptThreshold !== undefined) {
    (bypassInput as { shortPromptThreshold?: number }).shortPromptThreshold = shortPromptThreshold;
  }
  if (contextUsage !== undefined) {
    (bypassInput as { contextUsage?: { used: number; max: number } }).contextUsage = contextUsage;
  }

  return bypassInput;
}

/**
 * Builds improvement context from available sources
 */
async function buildImprovementContext(
  prompt: string,
  availableTools?: readonly string[],
  skillRules?: SkillRule[],
  agentDefinitions?: AgentDefinition[]
): Promise<ImprovementContext | undefined> {
  if (!availableTools && !skillRules && !agentDefinitions) {
    return undefined;
  }

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

  // Only return context if we have something
  if (!formattedContext.tools && !formattedContext.skills && !formattedContext.agents) {
    return undefined;
  }

  const improvementContext: ImprovementContext = {};
  if (formattedContext.tools) {
    (improvementContext as { tools?: string }).tools = formattedContext.tools;
  }
  if (formattedContext.skills) {
    (improvementContext as { skills?: string }).skills = formattedContext.skills;
  }
  if (formattedContext.agents) {
    (improvementContext as { agents?: string }).agents = formattedContext.agents;
  }

  return improvementContext;
}

/**
 * Builds improve options with mocks and context
 */
function buildImproveOptions(
  prompt: string,
  sessionId: string,
  config: Configuration,
  improvementContext: ImprovementContext | undefined,
  _mockImprovement?: string | null,
  _mockClassification?: string | null
): Parameters<typeof improvePrompt>[0] {
  const improveOptions: Parameters<typeof improvePrompt>[0] = {
    originalPrompt: prompt,
    sessionId,
    config,
  };

  // Handle mocks (combine both params for backward compat)
  if (_mockImprovement !== undefined) {
    (improveOptions as { _mockClaudeResponse?: string | null })._mockClaudeResponse = _mockImprovement;
  } else if (_mockClassification !== undefined) {
    // Backward compat - treat classification mock as improvement mock
    (improveOptions as { _mockClaudeResponse?: string | null })._mockClaudeResponse = _mockClassification;
  }

  if (improvementContext) {
    (improveOptions as { context?: ImprovementContext }).context = improvementContext;
  }

  return improveOptions;
}

/**
 * Processes a prompt through bypass detection and improvement
 * Returns passthrough on bypass conditions or errors
 */
export async function processPrompt(options: ProcessPromptOptions): Promise<ProcessPromptResult> {
  const { prompt, sessionId, availableTools, skillRules, agentDefinitions, _mockClassification, _mockImprovement } = options;

  // Check for bypass conditions (fast, synchronous check)
  const bypassInput = buildBypassCheckInput(options);
  const bypassResult = detectBypass(bypassInput);
  if (bypassResult.shouldBypass) {
    return bypassResult.reason
      ? { type: 'passthrough', bypassReason: bypassResult.reason }
      : { type: 'passthrough' };
  }

  // Build context from available sources
  const improvementContext = await buildImprovementContext(prompt, availableTools, skillRules, agentDefinitions);

  // Load config for model selection
  const config = await loadConfigFromStandardPaths();

  // Count tokens before improvement
  const tokensBefore = countTokens(prompt);

  // Build improve options with mocks and context
  const improveOptions = buildImproveOptions(prompt, sessionId, config, improvementContext, _mockImprovement, _mockClassification);

  // Improve the prompt with consistent error handling
  let improvement;
  try {
    improvement = await improvePrompt(improveOptions);
  } catch (err) {
    // Unexpected error during improvement - fallback to passthrough
    return { type: 'passthrough' };
  }

  // On improvement failure, fallback to passthrough
  if (!improvement.success || improvement.fallbackToOriginal) {
    return { type: 'passthrough' };
  }

  // Count tokens after improvement
  const tokensAfter = countTokens(improvement.improvedPrompt);

  return {
    type: 'improved',
    improvedPrompt: improvement.improvedPrompt,
    tokensBefore,
    tokensAfter,
    latencyMs: improvement.latencyMs,
    modelUsed: improvement.modelUsed,
    ...(improvement.summary !== undefined && { summary: improvement.summary }),
  };
}

/**
 * Main hook entry point
 * Reads stdin, processes prompt, writes stdout
 */
async function main(): Promise<void> {
  const startTime = performance.now();

  // Load configuration
  const config = await loadConfigFromStandardPaths();

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
    pluginDisabled: !config.enabled,
    forceImprove: config.forceImprove,
    shortPromptThreshold: config.shortPromptThreshold,
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

  // Calculate total latency
  const totalLatency = performance.now() - startTime;

  // Log the result if logging is enabled
  if (config.logging.enabled) {
    const logFilePath = generateLogFilePath(config.logging.logFilePath, config.logging.useTimestampedLogs);

    if (result.type === 'improved') {
      const logEntry = createLogEntry({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt,
        bypassReason: null,
        modelUsed: result.modelUsed,
        totalLatency,
        improvementLatency: result.latencyMs,
        contextSources: [],
        conversationId: context.conversation_id,
        level: 'INFO',
        phase: 'complete',
      });
      writeLogEntry(logEntry, logFilePath, config.logging.logLevel);
    } else {
      const logEntry = createLogEntry({
        originalPrompt: prompt,
        improvedPrompt: null,
        bypassReason: result.bypassReason ?? null,
        modelUsed: null,
        totalLatency,
        contextSources: [],
        conversationId: context.conversation_id,
        level: 'INFO',
        phase: result.bypassReason ? 'bypass' : 'complete',
      });
      writeLogEntry(logEntry, logFilePath, config.logging.logLevel);
    }
  }

  // Create output based on processing result
  let output: HookOutput;
  if (result.type === 'improved') {
    output = createHookOutput({
      type: 'improved',
      improvedPrompt: result.improvedPrompt,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      latencyMs: result.latencyMs,
      displayImprovedPrompt: config.logging.displayImprovedPrompt,
      ...(result.summary !== undefined && { summary: result.summary }),
    });
  } else {
    output = createHookOutput({
      type: 'passthrough',
      ...(result.bypassReason !== undefined && { bypassReason: result.bypassReason }),
    });
  }

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

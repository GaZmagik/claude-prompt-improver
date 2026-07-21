import type { AgentDefinition } from '../src/context/agent-suggester.ts';
import {
  type ContextBuilderInput,
  type FormattedContext,
  buildContext,
  formatContextForInjection,
} from '../src/context/context-builder.ts';
import type { SkillRule } from '../src/context/skill-matcher.ts';
import { type BypassCheckInput, detectBypass } from '../src/core/bypass-detector.ts';
import {
  ensureConfigSetup,
  loadConfigFromStandardPaths,
  resolveProjectBaseDir,
} from '../src/core/config-loader.ts';
/**
 * UserPromptSubmit hook entry point for Claude Prompt Improver Plugin
 * Handles stdin parsing, orchestration, and stdout output
 */
import type {
  BypassReason,
  ClaudeModel,
  Configuration,
  ContextSource,
  HookInput,
  HookOutput,
  IntegrationToggles,
  VisibilityInfo,
} from '../src/core/types.ts';
import {
  calculateContextFromTranscript,
  resolveContextWindow,
} from '../src/integrations/compaction-detector.ts';
import { type ImprovementContext, improvePrompt } from '../src/services/improver.ts';
import { createLogEntry, writeLogEntry } from '../src/utils/logger.ts';
import { generateLogFilePath } from '../src/utils/logger.ts';
import { formatSystemMessage } from '../src/utils/message-formatter.ts';
import { countTokens } from '../src/utils/token-counter.ts';

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

    // Claude Code sends a flat structure, not nested context
    // Expected format: { session_id, cwd, permission_mode, hook_event_name, prompt }
    const sessionId = parsed.session_id;
    if (typeof sessionId !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid "session_id" field',
      };
    }

    // Build context object from flat input structure
    const contextObj: Record<string, unknown> = {
      conversation_id: sessionId,
      message_index: 0, // Not provided by Claude Code, use default
    };

    if (typeof parsed.permission_mode === 'string') {
      contextObj.permission_mode = parsed.permission_mode;
    }
    if (typeof parsed.cwd === 'string') {
      contextObj.cwd = parsed.cwd;
    }
    if (typeof parsed.hook_event_name === 'string') {
      contextObj.hook_event_name = parsed.hook_event_name;
    }
    if (typeof parsed.transcript_path === 'string') {
      contextObj.transcript_path = parsed.transcript_path;
    }
    if (Array.isArray(parsed.available_tools)) {
      contextObj.available_tools = parsed.available_tools;
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
  // additionalContext must be inside hookSpecificOutput per Claude Code docs
  // See: https://code.claude.com/docs/en/hooks#hook-output
  if (output.additionalContext !== undefined) {
    result.hookSpecificOutput = {
      hookEventName: 'UserPromptSubmit',
      additionalContext: output.additionalContext,
    };
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
    ...(options.displayImprovedPrompt &&
      options.improvedPrompt !== undefined && {
        improvedPrompt: options.improvedPrompt,
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
  readonly defaultImprove?: boolean;
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
  /** Integration toggles from config */
  readonly integrations?: IntegrationToggles;
  /** Current working directory for integrations */
  readonly cwd?: string;
  /**
   * Pre-loaded configuration from the entry point. When provided, it drives
   * model selection instead of a second disk load (which would resolve
   * against the hook cwd and ignore the project/global config)
   */
  readonly config?: Configuration;
  /** For testing - mock the classification response */
  readonly _mockClassification?: string | null;
  /** For testing - mock the improvement response */
  readonly _mockImprovement?: string | null;
}

/**
 * Result of processing a prompt
 */
export type ProcessPromptResult =
  | { type: 'passthrough'; bypassReason?: BypassReason; error?: string }
  | {
      type: 'improved';
      improvedPrompt: string;
      tokensBefore: number;
      tokensAfter: number;
      summary?: readonly string[];
      latencyMs: number;
      modelUsed: ClaudeModel | null;
      contextSources: readonly ContextSource[];
    };

/**
 * Builds bypass check input from process options
 */
function buildBypassCheckInput(options: ProcessPromptOptions): BypassCheckInput {
  const {
    prompt,
    sessionId,
    permissionMode,
    pluginDisabled,
    forceImprove,
    defaultImprove,
    shortPromptThreshold,
    contextUsage,
  } = options;

  return {
    prompt,
    sessionId,
    ...(permissionMode !== undefined && { permissionMode }),
    ...(pluginDisabled !== undefined && { pluginDisabled }),
    ...(forceImprove !== undefined && { forceImprove }),
    ...(defaultImprove !== undefined && { defaultImprove }),
    ...(shortPromptThreshold !== undefined && { shortPromptThreshold }),
    ...(contextUsage !== undefined && { contextUsage }),
  };
}

/**
 * Options for building improvement context
 */
interface BuildImprovementContextOptions {
  readonly prompt: string;
  readonly availableTools?: readonly string[];
  readonly skillRules?: SkillRule[];
  readonly agentDefinitions?: AgentDefinition[];
  readonly integrations?: IntegrationToggles;
  readonly cwd?: string;
}

/**
 * Builds integration options for context builder based on enabled toggles
 */
function buildIntegrationOptions(
  integrations: IntegrationToggles,
  cwd?: string
): Partial<ContextBuilderInput> {
  const cwdOption = cwd ? { cwd } : {};
  return {
    ...(integrations.git && { gitOptions: { enabled: true, ...cwdOption } }),
    ...(integrations.lsp && { lspOptions: { enabled: true } }),
    ...(integrations.spec && { specOptions: { enabled: true, ...cwdOption } }),
    ...(integrations.memory && { memoryOptions: { enabled: true } }),
    ...(integrations.session && { sessionOptions: { enabled: true } }),
    ...(integrations.dynamicDiscovery && {
      dynamicDiscoveryOptions: { enabled: true, ...cwdOption },
    }),
    ...(integrations.pluginResources && {
      pluginResourcesOptions: { enabled: true, ...cwdOption },
    }),
    ...(integrations.projectShape && { projectShapeOptions: { enabled: true, ...cwdOption } }),
  };
}

/**
 * Maps formatted context to improvement context, excluding undefined fields
 */
function mapFormattedToImprovement(formatted: FormattedContext): ImprovementContext {
  return {
    ...(formatted.tools && { tools: formatted.tools }),
    ...(formatted.skills && { skills: formatted.skills }),
    ...(formatted.agents && { agents: formatted.agents }),
    ...(formatted.git && { git: formatted.git }),
    ...(formatted.lsp && { lsp: formatted.lsp }),
    ...(formatted.spec && { spec: formatted.spec }),
    ...(formatted.memory && { memory: formatted.memory }),
    ...(formatted.session && { session: formatted.session }),
    ...(formatted.dynamicDiscovery && { dynamicDiscovery: formatted.dynamicDiscovery }),
    ...(formatted.pluginResources && { pluginResources: formatted.pluginResources }),
    ...(formatted.projectShape && { projectShape: formatted.projectShape }),
  };
}

/**
 * Checks if any integration is enabled
 */
function hasEnabledIntegrations(integrations?: IntegrationToggles): boolean {
  if (!integrations) return false;
  return !!(
    integrations.git ||
    integrations.lsp ||
    integrations.spec ||
    integrations.memory ||
    integrations.session ||
    integrations.dynamicDiscovery ||
    integrations.pluginResources ||
    integrations.projectShape
  );
}

/**
 * Checks if formatted context has any content
 */
function hasFormattedContent(ctx: FormattedContext): boolean {
  return !!(
    ctx.tools ||
    ctx.skills ||
    ctx.agents ||
    ctx.git ||
    ctx.lsp ||
    ctx.spec ||
    ctx.memory ||
    ctx.session ||
    ctx.dynamicDiscovery ||
    ctx.pluginResources ||
    ctx.projectShape
  );
}

/**
 * Builds improvement context from available sources
 * Wires up all integration services (git, lsp, spec, memory, session, dynamicDiscovery, pluginResources)
 */
async function buildImprovementContext(
  options: BuildImprovementContextOptions
): Promise<ImprovementContext | undefined> {
  const { prompt, availableTools, skillRules, agentDefinitions, integrations, cwd } = options;

  // Check if we have any context sources to gather
  const hasToolContext = !!(availableTools || skillRules || agentDefinitions);
  if (!hasToolContext && !hasEnabledIntegrations(integrations)) {
    return undefined;
  }

  // Build context input using proper typing
  const contextInput: ContextBuilderInput = {
    prompt,
    ...(availableTools && { availableTools }),
    ...(skillRules && { skillRules }),
    ...(agentDefinitions && { agentDefinitions }),
    ...(integrations && buildIntegrationOptions(integrations, cwd)),
  };

  const builtContext = await buildContext(contextInput);
  const formattedContext = formatContextForInjection(builtContext);

  if (!hasFormattedContent(formattedContext)) {
    return undefined;
  }

  return mapFormattedToImprovement(formattedContext);
}

/**
 * Builds improve options with mocks and context
 */
function buildImproveOptions(
  prompt: string,
  config: Configuration,
  improvementContext: ImprovementContext | undefined,
  cwd?: string,
  _mockImprovement?: string | null,
  _mockClassification?: string | null
): Parameters<typeof improvePrompt>[0] {
  // Mocks: _mockImprovement wins; _mockClassification kept for backward compat
  const mockResponse = _mockImprovement !== undefined ? _mockImprovement : _mockClassification;

  return {
    originalPrompt: prompt,
    config,
    ...(cwd && { cwd }),
    ...(mockResponse !== undefined && { _mockClaudeResponse: mockResponse }),
    ...(improvementContext && { context: improvementContext }),
  };
}

/**
 * Runs the improvement call with consistent error handling: thrown errors
 * and failed results both collapse to an improvement_failed passthrough
 */
async function runImprovement(
  improveOptions: Parameters<typeof improvePrompt>[0]
): Promise<Awaited<ReturnType<typeof improvePrompt>> | ProcessPromptResult> {
  try {
    return await improvePrompt(improveOptions);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { type: 'passthrough', bypassReason: 'improvement_failed', error: errorMsg };
  }
}

/**
 * Processes a prompt through bypass detection and improvement
 * Returns passthrough on bypass conditions or errors
 */
export async function processPrompt(options: ProcessPromptOptions): Promise<ProcessPromptResult> {
  const {
    prompt,
    availableTools,
    skillRules,
    agentDefinitions,
    integrations,
    cwd,
    _mockClassification,
    _mockImprovement,
  } = options;

  // Check for bypass conditions (fast, synchronous check)
  const bypassInput = buildBypassCheckInput(options);
  const bypassResult = detectBypass(bypassInput);
  if (bypassResult.shouldBypass) {
    return bypassResult.reason
      ? { type: 'passthrough', bypassReason: bypassResult.reason }
      : { type: 'passthrough' };
  }

  // Use cleaned prompt if tags were stripped (e.g., #improve tag removal)
  const promptToImprove = bypassResult.cleanedPrompt ?? prompt;

  // Build context from available sources (tools, skills, agents, git, lsp, spec, memory, session)
  const improvementContext = await buildImprovementContext({
    prompt: promptToImprove,
    ...(availableTools && { availableTools }),
    ...(skillRules && { skillRules }),
    ...(agentDefinitions && { agentDefinitions }),
    ...(integrations && { integrations }),
    ...(cwd && { cwd }),
  });

  // Config for model selection: prefer the entry-point's already-resolved
  // config (project/global aware); only fall back to a disk load for callers
  // that don't supply one (e.g. tests)
  const config = options.config ?? (await loadConfigFromStandardPaths(resolveProjectBaseDir()));

  // Count tokens before improvement (use original prompt for accurate before count)
  const tokensBefore = countTokens(prompt);

  // Build improve options with mocks and context (use cleaned prompt)
  const improveOptions = buildImproveOptions(
    promptToImprove,
    config,
    improvementContext,
    cwd,
    _mockImprovement,
    _mockClassification
  );

  // Improve the prompt with consistent error handling
  const improvement = await runImprovement(improveOptions);
  if ('type' in improvement) {
    return improvement;
  }

  // On improvement failure, fallback to passthrough with reason
  if (!improvement.success || improvement.fallbackToOriginal) {
    return {
      type: 'passthrough',
      bypassReason: 'improvement_failed',
      ...(improvement.error && { error: improvement.error }),
    };
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
    contextSources: improvement.contextSources,
    ...(improvement.summary !== undefined && { summary: improvement.summary }),
  };
}

/**
 * Resolves context usage: prefer stdin-provided usage, fall back to
 * calculating from the transcript file
 */
async function resolveContextUsage(
  config: Configuration,
  context: HookInput['context']
): Promise<{ used: number; max: number } | undefined> {
  if (context.context_usage) {
    return { used: context.context_usage.used, max: context.context_usage.max };
  }

  if (!context.transcript_path) {
    return undefined;
  }

  // Claude Code doesn't provide context_usage to UserPromptSubmit hooks
  // Calculate it from the transcript file instead.
  // Resolve the window from config, then CLAUDE_CODE_MAX_CONTEXT_TOKENS
  // (visible to the hook), then a best-effort model id. Claude Code does not
  // send context_usage or the model to UserPromptSubmit hooks, so without a
  // configured or env value a 1M session is measured against the 200K default.
  const contextWindow = resolveContextWindow({
    ...(config.contextWindowTokens !== undefined && { configured: config.contextWindowTokens }),
    ...(process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined && {
      envValue: process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS,
    }),
    ...(context.session_settings?.model !== undefined && {
      model: context.session_settings.model,
    }),
  });
  const transcriptUsage = await calculateContextFromTranscript(
    context.transcript_path,
    contextWindow
  );
  return transcriptUsage ? { used: transcriptUsage.used, max: transcriptUsage.total } : undefined;
}

/**
 * Logs the processing result when logging is enabled
 */
function logResult(
  config: Configuration,
  result: ProcessPromptResult,
  prompt: string,
  conversationId: string,
  totalLatency: number
): void {
  if (!config.logging.enabled) {
    return;
  }

  const logFilePath = generateLogFilePath(
    config.logging.logFilePath,
    config.logging.useTimestampedLogs
  );

  const logEntry =
    result.type === 'improved'
      ? createLogEntry({
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt,
          bypassReason: null,
          modelUsed: result.modelUsed,
          totalLatency,
          improvementLatency: result.latencyMs,
          contextSources: result.contextSources,
          conversationId,
          level: 'INFO',
          phase: 'complete',
        })
      : createLogEntry({
          originalPrompt: prompt,
          improvedPrompt: null,
          bypassReason: result.bypassReason ?? null,
          modelUsed: null,
          totalLatency,
          contextSources: [],
          conversationId,
          level: result.bypassReason === 'improvement_failed' ? 'ERROR' : 'INFO',
          phase: result.bypassReason ? 'bypass' : 'complete',
          ...(result.error && { error: result.error }),
        });

  writeLogEntry(logEntry, logFilePath, config.logging.logLevel);
}

/**
 * Creates hook output for a processing result
 */
function createResultOutput(config: Configuration, result: ProcessPromptResult): HookOutput {
  if (result.type === 'improved') {
    return createHookOutput({
      type: 'improved',
      improvedPrompt: result.improvedPrompt,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      latencyMs: result.latencyMs,
      displayImprovedPrompt: config.logging.displayImprovedPrompt,
      ...(result.summary !== undefined && { summary: result.summary }),
    });
  }
  return createHookOutput({
    type: 'passthrough',
    ...(result.bypassReason !== undefined && { bypassReason: result.bypassReason }),
  });
}

/**
 * Main hook entry point
 * Reads stdin, processes prompt, writes stdout
 */
async function main(): Promise<void> {
  const startTime = performance.now();

  // Resolve the project root: a marketplace-installed hook runs from the
  // plugin cache dir, so config must be looked up against CLAUDE_PROJECT_DIR,
  // not the hook's cwd (else a present local config reads as "not found")
  const baseDir = resolveProjectBaseDir();

  // Ensure config setup exists (creates example.md if needed)
  const setupResult = await ensureConfigSetup(baseDir);
  const setupMessage = setupResult.message; // Will be included in output if present

  // Load configuration
  const config = await loadConfigFromStandardPaths(baseDir);

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

  // Get context usage - prefer from stdin, fallback to transcript calculation
  const contextUsage = await resolveContextUsage(config, context);

  // Build process options, only including optional fields when defined
  const processOptions: ProcessPromptOptions = {
    prompt,
    sessionId: context.conversation_id,
    pluginDisabled: !config.enabled,
    forceImprove: config.forceImprove,
    shortPromptThreshold: config.shortPromptThreshold,
    config, // thread the resolved config through so processPrompt doesn't reload
    ...(config.defaultImprove !== undefined && { defaultImprove: config.defaultImprove }),
    ...(context.permission_mode && { permissionMode: context.permission_mode }),
    ...(contextUsage && { contextUsage }),
    ...(config.integrations && { integrations: config.integrations }),
    ...(context.cwd && { cwd: context.cwd }),
    ...(context.available_tools &&
      context.available_tools.length > 0 && { availableTools: context.available_tools }),
  };

  // Process the prompt through improvement with all context sources
  const result = await processPrompt(processOptions);

  // Calculate total latency
  const totalLatency = performance.now() - startTime;

  logResult(config, result, prompt, context.conversation_id, totalLatency);

  // Create output based on processing result
  let output: HookOutput = createResultOutput(config, result);

  // Append setup message if config needs user attention
  if (setupMessage) {
    const existingSystemMessage = output.systemMessage ?? '';
    const separator = existingSystemMessage ? '\n\n' : '';
    output = {
      ...output,
      systemMessage: `${existingSystemMessage}${separator}📋 ${setupMessage}`,
    };
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

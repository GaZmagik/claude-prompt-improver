import {
  type GitContext,
  type GitContextOptions,
  formatGitContext,
  gatherGitContext,
} from '../integrations/git-context.ts';
import {
  type LspContext,
  type LspDiagnosticsOptions,
  formatLspContext,
  gatherLspDiagnostics,
} from '../integrations/lsp-diagnostics.ts';
import {
  type MemoryContext,
  type MemoryPluginOptions,
  formatMemoryContext,
  gatherMemoryContext,
} from '../integrations/memory-plugin.ts';
import {
  type SessionContext,
  type SessionContextOptions,
  formatSessionContext,
  gatherSessionContext,
} from '../integrations/session-context.ts';
import {
  type SpecAwarenessOptions,
  type SpecContext,
  formatSpecContext,
  gatherSpecContext,
} from '../integrations/spec-awareness.ts';
import {
  type AgentDefinition,
  type SuggestedAgent,
  formatAgentsContext,
  suggestAgents,
} from './agent-suggester.ts';
import {
  type MatchedSkill,
  type SkillRule,
  formatSkillsContext,
  matchSkills,
} from './skill-matcher.ts';
/**
 * Context builder for aggregating context from multiple sources
 * Orchestrates tool detection, skill matching, agent suggestion, and git context
 */
import { type DetectedTools, detectTools, formatToolsContext } from './tool-detector.ts';

/**
 * Helper type for async context gatherers
 */
interface AsyncContextResult<T> {
  readonly success: boolean;
  readonly context?: T;
}

/**
 * Creates an async task that gathers context and updates state on success
 */
function createAsyncTask<T>(
  gather: () => Promise<AsyncContextResult<T>>,
  onSuccess: (context: T) => void
): Promise<void> {
  return gather().then((result) => {
    if (result.success && result.context) {
      onSuccess(result.context);
    }
  });
}

/**
 * Formats a context field if present
 */
function formatField<T>(
  context: T | undefined,
  sources: readonly ContextSource[],
  source: ContextSource,
  formatter: (ctx: T) => string
): string | undefined {
  if (context && sources.includes(source)) {
    const formatted = formatter(context);
    return formatted || undefined;
  }
  return undefined;
}

/** Context source types */
export type ContextSource =
  | 'tools'
  | 'skills'
  | 'agents'
  | 'git'
  | 'lsp'
  | 'spec'
  | 'memory'
  | 'session';

/**
 * Input for building context
 */
export interface ContextBuilderInput {
  readonly prompt: string;
  readonly availableTools?: readonly string[];
  readonly skillRules?: SkillRule[];
  readonly agentDefinitions?: AgentDefinition[];
  readonly gitOptions?: GitContextOptions;
  readonly lspOptions?: LspDiagnosticsOptions;
  readonly specOptions?: SpecAwarenessOptions;
  readonly memoryOptions?: MemoryPluginOptions;
  readonly sessionOptions?: SessionContextOptions;
  readonly timeoutMs?: number;
}

/**
 * Built context result
 */
export interface BuiltContext {
  readonly sources: readonly ContextSource[];
  readonly tools?: DetectedTools;
  readonly skills?: readonly MatchedSkill[];
  readonly agents?: readonly SuggestedAgent[];
  readonly git?: GitContext;
  readonly lsp?: LspContext;
  readonly spec?: SpecContext;
  readonly memory?: MemoryContext;
  readonly session?: SessionContext;
}

/**
 * Formatted context for injection
 */
export interface FormattedContext {
  readonly tools?: string;
  readonly skills?: string;
  readonly agents?: string;
  readonly git?: string;
  readonly lsp?: string;
  readonly spec?: string;
  readonly memory?: string;
  readonly session?: string;
}

/**
 * Builds context from multiple sources
 */
export async function buildContext(input: ContextBuilderInput): Promise<BuiltContext> {
  const {
    prompt,
    availableTools,
    skillRules,
    agentDefinitions,
    gitOptions,
    lspOptions,
    specOptions,
    memoryOptions,
    sessionOptions,
  } = input;
  const sources: ContextSource[] = [];

  // Results container (mutable during gathering)
  const results: {
    tools?: DetectedTools;
    skills?: MatchedSkill[];
    agents?: SuggestedAgent[];
    git?: GitContext;
    lsp?: LspContext;
    spec?: SpecContext;
    memory?: MemoryContext;
    session?: SessionContext;
  } = {};

  // Gather synchronous context
  gatherSyncContext(prompt, availableTools, skillRules, agentDefinitions, sources, results);

  // Gather async context sources in parallel
  const asyncTasks = buildAsyncTasks(
    prompt,
    gitOptions,
    lspOptions,
    specOptions,
    memoryOptions,
    sessionOptions,
    sources,
    results
  );
  await Promise.allSettled(asyncTasks);

  return { sources, ...results };
}

/**
 * Gathers synchronous context (tools, skills, agents)
 */
function gatherSyncContext(
  prompt: string,
  availableTools: readonly string[] | undefined,
  skillRules: SkillRule[] | undefined,
  agentDefinitions: AgentDefinition[] | undefined,
  sources: ContextSource[],
  results: { tools?: DetectedTools; skills?: MatchedSkill[]; agents?: SuggestedAgent[] }
): void {
  if (availableTools && availableTools.length > 0) {
    const tools = detectTools(availableTools);
    if (tools.count > 0) {
      results.tools = tools;
      sources.push('tools');
    }
  }

  if (skillRules && skillRules.length > 0) {
    const matched = matchSkills(prompt, skillRules);
    if (matched.length > 0) {
      results.skills = matched;
      sources.push('skills');
    }
  }

  if (agentDefinitions && agentDefinitions.length > 0) {
    const suggested = suggestAgents(prompt, agentDefinitions);
    if (suggested.length > 0) {
      results.agents = suggested;
      sources.push('agents');
    }
  }
}

/**
 * Builds array of async tasks for parallel context gathering
 */
function buildAsyncTasks(
  prompt: string,
  gitOptions: GitContextOptions | undefined,
  lspOptions: LspDiagnosticsOptions | undefined,
  specOptions: SpecAwarenessOptions | undefined,
  memoryOptions: MemoryPluginOptions | undefined,
  sessionOptions: SessionContextOptions | undefined,
  sources: ContextSource[],
  results: {
    git?: GitContext;
    lsp?: LspContext;
    spec?: SpecContext;
    memory?: MemoryContext;
    session?: SessionContext;
  }
): Promise<void>[] {
  const tasks: Promise<void>[] = [];

  if (gitOptions && gitOptions.enabled !== false) {
    tasks.push(
      createAsyncTask(
        () => gatherGitContext(gitOptions),
        (ctx) => {
          results.git = ctx;
          sources.push('git');
        }
      )
    );
  }

  if (lspOptions && lspOptions.enabled !== false) {
    tasks.push(
      createAsyncTask(
        () => gatherLspDiagnostics({ ...lspOptions, prompt }),
        (ctx) => {
          results.lsp = ctx;
          sources.push('lsp');
        }
      )
    );
  }

  if (specOptions && specOptions.enabled !== false) {
    tasks.push(
      createAsyncTask(
        () => gatherSpecContext(specOptions),
        (ctx) => {
          results.spec = ctx;
          sources.push('spec');
        }
      )
    );
  }

  if (memoryOptions && memoryOptions.enabled !== false) {
    tasks.push(
      createAsyncTask(
        () => gatherMemoryContext({ ...memoryOptions, prompt }),
        (ctx) => {
          results.memory = ctx;
          sources.push('memory');
        }
      )
    );
  }

  if (sessionOptions && sessionOptions.enabled !== false) {
    tasks.push(
      createAsyncTask(
        () => gatherSessionContext({ ...sessionOptions, prompt }),
        (ctx) => {
          results.session = ctx;
          sources.push('session');
        }
      )
    );
  }

  return tasks;
}

/**
 * Formats built context for injection into improvement prompt
 */
export function formatContextForInjection(context: BuiltContext): FormattedContext {
  const { sources } = context;

  // Format each field
  const tools = formatField(context.tools, sources, 'tools', formatToolsContext);
  const skills = formatField(context.skills, sources, 'skills', (s) => formatSkillsContext([...s]));
  const agents = formatField(context.agents, sources, 'agents', (a) => formatAgentsContext([...a]));
  const git = formatField(context.git, sources, 'git', formatGitContext);
  const lsp = formatField(context.lsp, sources, 'lsp', formatLspContext);
  const spec = formatField(context.spec, sources, 'spec', formatSpecContext);
  const memory = formatField(context.memory, sources, 'memory', formatMemoryContext);
  const session = formatField(context.session, sources, 'session', formatSessionContext);

  // Build result with conditional property inclusion (exactOptionalPropertyTypes)
  return {
    ...(tools !== undefined && { tools }),
    ...(skills !== undefined && { skills }),
    ...(agents !== undefined && { agents }),
    ...(git !== undefined && { git }),
    ...(lsp !== undefined && { lsp }),
    ...(spec !== undefined && { spec }),
    ...(memory !== undefined && { memory }),
    ...(session !== undefined && { session }),
  };
}

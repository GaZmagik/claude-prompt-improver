/**
 * Context builder for aggregating context from multiple sources
 * Orchestrates tool detection, skill matching, agent suggestion, and git context
 */
import { detectTools, formatToolsContext, type DetectedTools } from './tool-detector.ts';
import { matchSkills, formatSkillsContext, type SkillRule, type MatchedSkill } from './skill-matcher.ts';
import { suggestAgents, formatAgentsContext, type AgentDefinition, type SuggestedAgent } from './agent-suggester.ts';
import { gatherGitContext, formatGitContext, type GitContext, type GitContextOptions } from '../integrations/git-context.ts';
import { gatherLspDiagnostics, formatLspContext, type LspContext, type LspDiagnosticsOptions } from '../integrations/lsp-diagnostics.ts';
import { gatherSpecContext, formatSpecContext, type SpecContext, type SpecAwarenessOptions } from '../integrations/spec-awareness.ts';
import { gatherMemoryContext, formatMemoryContext, type MemoryContext, type MemoryPluginOptions } from '../integrations/memory-plugin.ts';
import { gatherSessionContext, formatSessionContext, type SessionContext, type SessionContextOptions } from '../integrations/session-context.ts';

/** Context source types */
export type ContextSource = 'tools' | 'skills' | 'agents' | 'git' | 'lsp' | 'spec' | 'memory' | 'session';

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
  const { prompt, availableTools, skillRules, agentDefinitions, gitOptions, lspOptions, specOptions, memoryOptions, sessionOptions } = input;
  const sources: ContextSource[] = [];

  let tools: DetectedTools | undefined;
  let skills: MatchedSkill[] | undefined;
  let agents: SuggestedAgent[] | undefined;
  let git: GitContext | undefined;
  let lsp: LspContext | undefined;
  let spec: SpecContext | undefined;
  let memory: MemoryContext | undefined;
  let session: SessionContext | undefined;

  // Detect tools
  if (availableTools && availableTools.length > 0) {
    tools = detectTools(availableTools);
    if (tools.count > 0) {
      sources.push('tools');
    }
  }

  // Match skills
  if (skillRules && skillRules.length > 0) {
    const matched = matchSkills(prompt, skillRules);
    if (matched.length > 0) {
      skills = matched;
      sources.push('skills');
    }
  }

  // Suggest agents
  if (agentDefinitions && agentDefinitions.length > 0) {
    const suggested = suggestAgents(prompt, agentDefinitions);
    if (suggested.length > 0) {
      agents = suggested;
      sources.push('agents');
    }
  }

  // Gather git context
  if (gitOptions && gitOptions.enabled !== false) {
    const gitResult = await gatherGitContext(gitOptions);
    if (gitResult.success && gitResult.context) {
      git = gitResult.context;
      sources.push('git');
    }
  }

  // Gather LSP diagnostics
  if (lspOptions && lspOptions.enabled !== false) {
    const lspResult = await gatherLspDiagnostics({ ...lspOptions, prompt });
    if (lspResult.success && lspResult.context) {
      lsp = lspResult.context;
      sources.push('lsp');
    }
  }

  // Gather spec context
  if (specOptions && specOptions.enabled !== false) {
    const specResult = await gatherSpecContext(specOptions);
    if (specResult.success && specResult.context) {
      spec = specResult.context;
      sources.push('spec');
    }
  }

  // Gather memory context
  if (memoryOptions && memoryOptions.enabled !== false) {
    const memoryResult = await gatherMemoryContext({ ...memoryOptions, prompt });
    if (memoryResult.success && memoryResult.context) {
      memory = memoryResult.context;
      sources.push('memory');
    }
  }

  // Gather session context
  if (sessionOptions && sessionOptions.enabled !== false) {
    const sessionResult = await gatherSessionContext({ ...sessionOptions, prompt });
    if (sessionResult.success && sessionResult.context) {
      session = sessionResult.context;
      sources.push('session');
    }
  }

  const result: BuiltContext = { sources };

  if (tools) {
    (result as { tools?: DetectedTools }).tools = tools;
  }
  if (skills) {
    (result as { skills?: readonly MatchedSkill[] }).skills = skills;
  }
  if (agents) {
    (result as { agents?: readonly SuggestedAgent[] }).agents = agents;
  }
  if (git) {
    (result as { git?: GitContext }).git = git;
  }
  if (lsp) {
    (result as { lsp?: LspContext }).lsp = lsp;
  }
  if (spec) {
    (result as { spec?: SpecContext }).spec = spec;
  }
  if (memory) {
    (result as { memory?: MemoryContext }).memory = memory;
  }
  if (session) {
    (result as { session?: SessionContext }).session = session;
  }

  return result;
}

/**
 * Formats built context for injection into improvement prompt
 */
export function formatContextForInjection(context: BuiltContext): FormattedContext {
  const result: FormattedContext = {};

  if (context.tools && context.sources.includes('tools')) {
    const formatted = formatToolsContext(context.tools);
    if (formatted) {
      (result as { tools?: string }).tools = formatted;
    }
  }

  if (context.skills && context.sources.includes('skills')) {
    const formatted = formatSkillsContext([...context.skills]);
    if (formatted) {
      (result as { skills?: string }).skills = formatted;
    }
  }

  if (context.agents && context.sources.includes('agents')) {
    const formatted = formatAgentsContext([...context.agents]);
    if (formatted) {
      (result as { agents?: string }).agents = formatted;
    }
  }

  if (context.git && context.sources.includes('git')) {
    const formatted = formatGitContext(context.git);
    if (formatted) {
      (result as { git?: string }).git = formatted;
    }
  }

  if (context.lsp && context.sources.includes('lsp')) {
    const formatted = formatLspContext(context.lsp);
    if (formatted) {
      (result as { lsp?: string }).lsp = formatted;
    }
  }

  if (context.spec && context.sources.includes('spec')) {
    const formatted = formatSpecContext(context.spec);
    if (formatted) {
      (result as { spec?: string }).spec = formatted;
    }
  }

  if (context.memory && context.sources.includes('memory')) {
    const formatted = formatMemoryContext(context.memory);
    if (formatted) {
      (result as { memory?: string }).memory = formatted;
    }
  }

  if (context.session && context.sources.includes('session')) {
    const formatted = formatSessionContext(context.session);
    if (formatted) {
      (result as { session?: string }).session = formatted;
    }
  }

  return result;
}

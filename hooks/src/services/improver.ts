// Timeout constants no longer needed - using model-based timeouts
/**
 * Prompt improver for enhancing user prompts
 * Uses config-driven model selection for all improvements
 */
import type { ClaudeModel, Configuration, ContextSource, PromptGenre } from '../core/types.ts';
import { escapeXmlContent } from '../utils/xml-builder.ts';
import { executeClaudeCommand } from './claude-client.ts';
import { classifyPromptGenre } from './prompt-genre.ts';

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
  readonly pluginResources?: string;
  readonly projectShape?: string;
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
  /** Genre the prompt was classified as (drives template specialisation) */
  readonly genre?: PromptGenre;
  /** Error message when improvement fails (for debugging) */
  readonly error?: string;
}

/**
 * Returns the appropriate timeout for the model
 */
function getTimeoutForModel(model: ClaudeModel): number {
  // Must stay under the 120s hook budget in hooks/hooks.json
  switch (model) {
    case 'opus': return 100_000;
    case 'sonnet': return 90_000;
    case 'haiku': return 60_000;
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
  if (context.pluginResources) sources.push('pluginResources');
  if (context.projectShape) sources.push('projectShape');

  return sources;
}

/**
 * Strips a markdown code fence that wraps the entire improver output
 * Models sometimes fence their response (e.g. \`\`\`xml ... \`\`\`) despite
 * instructions; fences inside the prompt body are left intact
 */
export function stripWrappingCodeFence(output: string): string {
  const fenceMatch = output.trim().match(/^```\w*\r?\n([\s\S]*?)\r?\n```$/);
  return fenceMatch?.[1] ?? output;
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

  // Detect structuring added - XML tags or prose structure (numbered lists)
  const xmlTagPattern = /<(task|context|constraints|output_format|examples)>/;
  const numberedListPattern = /^\s*\d+[.)]\s/m;
  const hasStructure =
    xmlTagPattern.test(improvedPrompt) || numberedListPattern.test(improvedPrompt);
  const originalHasStructure =
    xmlTagPattern.test(originalPrompt) || numberedListPattern.test(originalPrompt);
  if (hasStructure && !originalHasStructure) {
    changes.push('Added structure');
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
  if (context.pluginResources) {
    sections.push(`<plugin_resources>\n${escapeXmlContent(context.pluginResources)}\n</plugin_resources>`);
  }
  if (context.projectShape) {
    sections.push(`<project_shape>\n${escapeXmlContent(context.projectShape)}\n</project_shape>`);
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
const TEMPLATE_HEADER = `[FORKED SESSION - PROMPT IMPROVEMENT AGENT]

You are running in a FORKED SESSION as a specialised prompt improvement agent.
You are NOT the assistant from the previous conversation.
Your ONLY task is to output an improved version of the user's prompt.

CRITICAL BOUNDARIES:
- DO NOT continue or respond to the previous conversation
- DO NOT ask questions or request clarification
- DO NOT explain your reasoning or add commentary
- DO NOT reference what was previously discussed
- Output ONLY the improved prompt, nothing else`;

/** Guidelines applied to every genre */
const CORE_GUIDELINES = `Improvement guidelines:
1. PRESERVE the original intent - the user's goal must remain unchanged
2. PRESERVE the original tone - formal/informal, concise/detailed
3. ADD clarity and specificity - name concrete files, functions, symbols, and branches from the available context; never invent paths or symbols the context does not support
4. Write the improved prompt as natural prose, not XML. Open with the goal and why it matters, then state scope and constraints. For multi-part work, enumerate the specific questions or steps as a numbered list. Only keep XML tags if the original prompt already used them
5. Always specify the expected deliverable: what the report, verdict, or output should contain and what shape it should take
6. End non-trivial task prompts by naming how to VERIFY the work: what to run, what to observe, and what evidence to report back
7. For advice or design questions, instruct candour: state plainly if the approach is a mistake, and flag any assumptions being disagreed with rather than silently accepting them
8. Make reasonable assumptions based on available context
9. Reference relevant tools, skills, or agents from your system prompt when they could help the user's task
10. Do not pad simple prompts with ceremony, and do not suggest subagents or workflows for simple, single-file, or conversational requests - depth must be proportionate to the task`;

/** Genre-specific guideline blocks - only the matching block is included */
const GENRE_GUIDELINES: Record<PromptGenre, string> = {
  fix: `This prompt is a bug fix. Additionally:
- Require reproduction before fixing, and a test that fails before the fix and passes after
- Ask for the root cause, the fix, and the covering test in the report`,
  investigate: `This prompt is a code investigation or audit. Additionally:
- Require evidence: cite file:line with short excerpts, and demand an explicit verdict or recommendation at the end rather than an open-ended summary
- When the same questions apply to multiple items (repos, claims, files, endpoints), instruct that EACH item gets the full question set answered precisely, not a blended overview
- Add noise guards so precision beats volume: "only flag X if [concrete cost/evidence criterion]", a cap on results ("up to N findings"), and a requirement to quote the exact rule or line behind each finding
- When the output will feed further processing, specify a strict output contract: the exact fields or format (e.g. a JSON array of {file, line, summary}), any caps, and "return ONLY the [format], nothing else"
- Where it sharpens focus, open with a role or angle assignment, name the concrete first actions or commands to run, and seed specific hypotheses to check rather than leaving questions abstract
- State scope and output discipline: where to work (directory, branch), read-only if applicable, and conclusions in the final message rather than raw file dumps
- For broad sweeps across many files, add a constraint to fan the work out to subagents and keep only the findings in the main session`,
  research: `This prompt is external research or fact-checking. Additionally:
- Demand epistemic discipline: verbatim quotes with source links, findings separated into VERIFIED (actually read from a doc/repo) versus inferred, and a verdict per claim (e.g. CONFIRMED / PARTLY RIGHT / WRONG / OUTDATED)
- Instruct honest negative results: if the answer is "nobody has built this" or "the evidence does not exist", say so plainly instead of hedging
- Name the concrete tools, sources, or literal search queries and URLs to use when the context supports them; if key terms could be confused, add a short disambiguation up front
- Apply the full question set to EACH item (repos, claims, vendors) when the prompt spans several
- State output discipline: no file writes, findings returned in the final message, not raw file dumps
- For multi-source sweeps, suggest subagent fan-out, or an explicit workflow opt-in ("use a workflow for this") for exhaustive research - Claude Code only runs workflows when asked`,
  build: `This prompt is implementation work. Additionally:
- When the context supports it, list required reading first in priority order, marking which sources are authoritative and which are superseded, and state the domain concept or mental model the work depends on
- Point at proven prior results to reproduce rather than re-derive
- Turn acceptance criteria into assertable invariants the build must check ("assert X and warn - never silently drop data"), and include a concrete worked example to sanity-check the result end to end; where the stakes justify it, require tests to prove themselves by going red on a broken build
- State non-goals explicitly with their rationale ("do NOT do X - [reason]"), and where known pitfalls exist in the context, quantify their concrete cost so they cannot be shrugged off
- Hand over pre-verified facts in a background block marked "already verified - trust this" so they are not re-derived or second-guessed, and mark deliberate existing behaviour as intentional ("X is intentional - do NOT change it") so it is not "fixed"
- Point at an established idiom in the repo to copy exactly ("reuse the pattern in <file>"), and instruct reuse-before-write: check for an existing helper before adding a new one
- Specify failure-mode behaviour and precedence precisely: guards that degrade gracefully ("if X is missing, fall back to Y - must not throw"), which side wins when data overlaps, and hot path constraints ("no synchronous I/O in render paths")
- State the agent's lane when a wider process owns the rest ("author files only; do NOT run the build - the orchestrator does that"), and require the report to surface any assumptions made (e.g. concurrency, how a handle was obtained)
- For codebase-wide mechanical changes (migrations, sweeping renames), add an explicit workflow opt-in ("use a workflow for this") - Claude Code only runs workflows when the prompt asks for one`,
  general: '',
};

/** Built-in worked examples per genre - replaced by a user exemplar when configured */
const GENRE_EXAMPLES: Record<PromptGenre, string> = {
  fix: `Worked example of the expected transformation:

<example>
<example_original>
fix the login bug
</example_original>
<example_improved>
Investigate and fix the login bug. Start from the authentication flow and check recent changes to login-related files first. Reproduce the bug before fixing it, and add or update a test that fails before the fix and passes after. Report the root cause, the fix, and the test that covers it.
</example_improved>
</example>`,
  investigate: `Worked example of the expected transformation:

<example>
<example_original>
check all our api endpoints have auth
</example_original>
<example_improved>
Audit every API endpoint for missing or inconsistent authentication checks, so we know the exposure before the next release. Read-only; be thorough and cite file:line with short excerpts. Fan the audit out to subagents, one per module or route group, so the main session receives only findings.

Report:
1. Every route registration and whether an auth middleware guards it, with file:line.
2. Endpoints that bypass the shared middleware (inline handlers, websockets, static mounts) and why.
3. Inconsistencies between modules - different auth schemes, mixed session/token checks.

Give a clear verdict: a table of unprotected endpoints (path, method, severity) and the single most likely systemic cause.
</example_improved>
</example>`,
  research: `Worked example of the expected transformation:

<example>
<example_original>
is anyone still maintaining left-pad-utils? can we keep using it
</example_original>
<example_improved>
Research task: determine whether left-pad-utils is still maintained and safe to keep as a dependency. Search the web and GitHub (WebSearch, WebFetch, gh CLI) - try "left-pad-utils maintained", "left-pad-utils deprecation", and the repo's commit/issue activity directly.

Report with quotes and links:
1. Last release and last non-trivial commit, with dates.
2. Open security advisories or unpatched CVEs.
3. Maintainer statements about the project's future (README notices, pinned issues, deprecation warnings).
4. Actively maintained alternatives, and whether migration would be mechanical for our usage.

Separate VERIFIED findings (read from the repo, registry, or advisory database - quote them) from inferred ones. If the project is abandoned, say so plainly. Give a clear verdict: keep, replace, or vendor - with the single strongest piece of evidence. Do not write any files; return findings as your final message.
</example_improved>
</example>`,
  build: `Worked example of the expected transformation:

<example>
<example_original>
migrate everything from moment to date-fns
</example_original>
<example_improved>
Migrate the entire codebase from moment to date-fns. This is a mechanical, codebase-wide migration touching many files independently, so use a workflow for this: discover every moment usage first, then transform each file in parallel, then verify with the full test suite. Do not change behaviour, only the date library. Report any call sites with no direct date-fns equivalent instead of guessing at a replacement.
</example_improved>
</example>`,
  general: '',
};

/**
 * Builds the worked-example section for a genre, preferring a user exemplar
 * User exemplars are gold-standard prompts supplied via configuration
 */
function buildExampleSection(
  genre: PromptGenre,
  exemplars?: Partial<Record<PromptGenre, string>>
): string {
  const exemplar = exemplars?.[genre];
  if (exemplar) {
    return `Gold-standard example of the target style (from the user's own prompt library):

<example>
<example_improved>
${exemplar}
</example_improved>
</example>`;
  }
  return GENRE_EXAMPLES[genre];
}

/**
 * Builds the improvement prompt with context
 * The template is genre-conditional: core guidelines always apply, and the
 * matching genre's guideline block and worked example are appended
 * User content is escaped to prevent XML/prompt injection
 */
export function buildImprovementPrompt(options: {
  originalPrompt: string;
  context?: ImprovementContext;
  genre?: PromptGenre;
  exemplars?: Partial<Record<PromptGenre, string>>;
}): string {
  const { originalPrompt, context, exemplars } = options;
  const genre = options.genre ?? classifyPromptGenre(originalPrompt);
  const contextSection = buildContextSection(context);

  // Escape user prompt to prevent XML/prompt injection
  const escapedPrompt = escapeXmlContent(originalPrompt);

  const sections = [
    TEMPLATE_HEADER,
    CORE_GUIDELINES,
    GENRE_GUIDELINES[genre],
    buildExampleSection(genre, exemplars),
    contextSection ? `Available context:\n${contextSection}` : '',
    `Original prompt to improve:
<original_prompt>
${escapedPrompt}
</original_prompt>`,
    'Output ONLY the improved prompt. No preamble. No explanation.',
  ];

  return sections.filter((s) => s.length > 0).join('\n\n');
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
  const genre = classifyPromptGenre(originalPrompt);

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
        genre,
      };
    }

    const mockImproved = stripWrappingCodeFence(_mockClaudeResponse);
    const summary = generateImprovementSummary(originalPrompt, mockImproved);

    return {
      success: true,
      improvedPrompt: mockImproved,
      fallbackToOriginal: false,
      modelUsed: model,
      latencyMs,
      contextSources,
      summary,
      genre,
    };
  }

  // Real improvement via Claude
  const improvementPrompt = buildImprovementPrompt({
    originalPrompt,
    genre,
    ...(context && { context }),
    ...(config.exemplars && { exemplars: config.exemplars }),
  });

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
      genre,
    };
  }

  const improved = stripWrappingCodeFence(result.output);
  const summary = generateImprovementSummary(originalPrompt, improved);

  return {
    success: true,
    improvedPrompt: improved,
    fallbackToOriginal: false,
    modelUsed: model,
    latencyMs,
    contextSources,
    summary,
    genre,
  };
}

/**
 * Core type definitions for Claude Prompt Improver Plugin
 * Based on data-model.md specification
 */

// Classification has been removed - we now always improve prompts

// Claude model selection
export type ClaudeModel = 'haiku' | 'sonnet' | 'opus';

// Context sources that can contribute to prompt improvement
export type ContextSource =
  | 'tools'
  | 'skills'
  | 'agents'
  | 'git'
  | 'lsp'
  | 'spec'
  | 'memory'
  | 'session';

// Reasons why a prompt may be bypassed
export type BypassReason =
  | 'short_prompt'
  | 'skip_tag'
  | 'low_context'
  | 'forked_session'
  | 'plugin_disabled'
  | 'classification_failed'
  | 'improvement_failed';

// Valid XML tags for structured prompts
export type XmlTag = 'task' | 'context' | 'constraints' | 'output_format' | 'examples';

// Log levels for filtering
export type LogLevel = 'ERROR' | 'INFO' | 'DEBUG';

/**
 * Original user prompt before processing
 */
export interface Prompt {
  readonly originalText: string;
  readonly tokenCount: number;
  readonly submittedAt: Date;
  readonly conversationId: string;
  readonly messageIndex: number;
}

/**
 * Enhanced version of user prompt after improvement
 */
export interface ImprovedPrompt {
  readonly improvedText: string;
  readonly originalPromptId: string;
  readonly appliedTags: readonly XmlTag[];
  readonly injectedContext: readonly ContextSource[];
  readonly modelUsed: ClaudeModel;
  readonly improvementLatency: number;
  readonly preservedIntent: boolean;
  readonly createdAt: Date;
}

/**
 * Classification assessment of a prompt
 * @deprecated Classification has been removed in v2.0.0 - we now always improve prompts
 */
export interface Classification {
  readonly level: 'NONE' | 'SIMPLE' | 'COMPLEX';
  readonly reasoning: string;
  readonly confidence?: number;
  readonly modelUsed: 'haiku';
  readonly classificationLatency: number;
  readonly promptId: string;
  readonly classifiedAt: Date;
}

/**
 * Context gathered from various sources
 */
export interface Context {
  readonly source: ContextSource;
  readonly content: string;
  readonly relevanceScore?: number;
  readonly gatheredAt: Date;
  readonly gatheringLatency: number;
  readonly promptId: string;
}

/**
 * Integration toggle settings
 */
export interface IntegrationToggles {
  readonly git: boolean;
  readonly lsp: boolean;
  readonly spec: boolean;
  readonly memory: boolean;
  readonly session: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly enabled: boolean;
  readonly logFilePath: string;
  readonly logLevel: LogLevel;
  readonly maxLogSizeMB: number;
  readonly maxLogAgeDays: number;
  readonly displayImprovedPrompt: boolean;
  readonly useTimestampedLogs: boolean;
}

/**
 * User-defined plugin configuration
 */
export interface Configuration {
  readonly enabled: boolean;
  readonly forceImprove: boolean;
  readonly shortPromptThreshold: number;
  readonly compactionThreshold: number;

  /** @deprecated No longer used - use improverModel instead */
  readonly defaultSimpleModel: ClaudeModel;
  /** @deprecated No longer used - use improverModel instead */
  readonly defaultComplexModel: ClaudeModel;

  /** Model for all improvements (haiku, sonnet, or opus). Defaults to haiku */
  readonly improverModel: ClaudeModel;

  readonly integrations: IntegrationToggles;
  readonly logging: LoggingConfig;
}

/**
 * Record of why a prompt was bypassed
 */
export interface BypassDecision {
  readonly reason: BypassReason;
  readonly promptId: string;
  readonly detectedAt: Date;
  readonly detectionLatency: number;
}

/**
 * Log entry for prompt processing
 */
export interface LogEntry {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly phase: 'bypass' | 'improve' | 'complete';
  readonly promptPreview: string;
  readonly improvedPrompt: string | null;
  readonly bypassReason: BypassReason | null;
  readonly modelUsed: ClaudeModel | null;
  readonly totalLatency: number;
  readonly improvementLatency?: number;
  readonly contextSources: readonly ContextSource[];
  readonly conversationId: string;
  readonly error?: string;
}

/**
 * Hook stdin structure from Claude Code
 */
export interface HookInput {
  readonly prompt: string;
  readonly context: HookContext;
}

/**
 * Context provided via hook stdin
 */
export interface HookContext {
  readonly conversation_id: string;
  readonly message_index: number;
  readonly permission_mode?: string;
  readonly cwd?: string;
  readonly available_tools?: readonly string[];
  readonly enabled_mcp_servers?: readonly string[];
  readonly context_usage?: ContextUsage;
  readonly session_settings?: SessionSettings;
}

/**
 * Context usage statistics
 */
export interface ContextUsage {
  readonly used: number;
  readonly max: number;
  readonly auto_compaction_enabled: boolean;
}

/**
 * Session settings from hook context
 */
export interface SessionSettings {
  readonly model?: string;
  readonly skills?: readonly string[];
}

/**
 * Hook stdout structure for Claude Code
 */
export interface HookOutput {
  readonly continue?: boolean;
  readonly systemMessage?: string;
  readonly userMessage?: string;
  readonly additionalContext?: string;
}

/**
 * Visibility information for user-facing messages
 */
export interface VisibilityInfo {
  readonly status: 'bypassed' | 'applied' | 'failed';
  readonly bypassReason?: BypassReason;
  readonly tokensBefore?: number;
  readonly tokensAfter?: number;
  readonly summary?: readonly string[];
  readonly errorHint?: string;
  readonly latencyMs?: number;
  readonly improvedPrompt?: string;
}

/**
 * Configuration loader for Claude Prompt Improver Plugin
 * Loads and validates user configuration from markdown files with YAML frontmatter
 * Similar to claude-memory-plugin's local.md pattern
 */
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type {
  Configuration,
  IntegrationToggles,
  LogLevel,
  LoggingConfig,
  PromptGenre,
} from './types.ts';

/**
 * Validation error for configuration fields
 */
export interface ConfigValidationError {
  readonly field: string;
  readonly message: string;
  readonly value: unknown;
}

/**
 * Validates if a string is a valid LogLevel
 */
function isValidLogLevel(value: string): value is LogLevel {
  return value === 'ERROR' || value === 'INFO' || value === 'DEBUG';
}

/**
 * Default integration toggles - all enabled
 */
const DEFAULT_INTEGRATIONS: IntegrationToggles = {
  git: true,
  lsp: true,
  spec: true,
  memory: true,
  session: true,
  dynamicDiscovery: true,
  pluginResources: true,
  projectShape: true,
};

/**
 * Default logging configuration
 */
const DEFAULT_LOGGING: LoggingConfig = {
  enabled: true,
  logFilePath: '.claude/logs/prompt-improver-latest.log',
  logLevel: 'INFO',
  maxLogSizeMB: 10,
  maxLogAgeDays: 7,
  displayImprovedPrompt: true,
  useTimestampedLogs: false,
};

/**
 * Default configuration with sensible values
 */
export const DEFAULT_CONFIG: Configuration = {
  enabled: true,
  forceImprove: false,
  shortPromptThreshold: 10,
  compactionThreshold: 5,
  defaultSimpleModel: 'haiku',
  defaultComplexModel: 'sonnet',
  improverModel: 'haiku', // Default to haiku (fast, cost-effective)
  integrations: DEFAULT_INTEGRATIONS,
  logging: DEFAULT_LOGGING,
};

/** Config file paths in order of precedence */
export const CONFIG_PATHS = [
  '.claude/prompt-improver.local.md', // Primary: project-local config
  '.claude/prompt-improver-config.json', // Legacy: JSON format (backwards compat)
] as const;

/** Path to example config file in project */
export const EXAMPLE_CONFIG_PATH = '.claude/prompt-improver.example.md';

/**
 * Resolves the project base directory for config lookup
 *
 * A marketplace-installed hook runs from the plugin cache directory, not the
 * user's project, so a bare `.` misses the project's `.claude/` config and
 * wrongly reports "config not found". Claude Code sets CLAUDE_PROJECT_DIR to
 * the project root for hooks. Precedence: an explicit cwd, then
 * CLAUDE_PROJECT_DIR, then `.`.
 *
 * @param cwd Optional explicit directory (e.g. the hook's context.cwd)
 * @returns The directory to resolve `.claude/prompt-improver.*` against
 */
export function resolveProjectBaseDir(cwd?: string): string {
  if (cwd && cwd.length > 0) {
    return cwd;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir && projectDir.length > 0) {
    return projectDir;
  }
  return '.';
}

/** Path to bundled example template (relative to src/core directory) */
const BUNDLED_TEMPLATE_PATH = '../../templates/prompt-improver.example.md';

/** Result of config setup check */
export interface ConfigSetupResult {
  readonly status: 'local_exists' | 'example_exists' | 'example_created' | 'setup_failed';
  readonly message?: string;
}

/**
 * Gets the path to the bundled template file
 * Resolves relative to the current module's location
 */
function getBundledTemplatePath(): string {
  // import.meta.dir gives us the directory of this module
  return join(import.meta.dir, BUNDLED_TEMPLATE_PATH);
}

/**
 * Ensures config setup exists, creating example.md if neither config exists
 * Returns status indicating what was found/created
 */
export async function ensureConfigSetup(
  baseDir = '.',
  homeDir: string = homedir()
): Promise<ConfigSetupResult> {
  const localPath = join(baseDir, CONFIG_PATHS[0]);
  const examplePath = join(baseDir, EXAMPLE_CONFIG_PATH);

  // Check if a project-local or user-global local.md exists
  try {
    await access(localPath);
    return { status: 'local_exists' };
  } catch {
    // project local.md doesn't exist, continue
  }

  try {
    await access(getGlobalConfigPath(homeDir));
    return { status: 'local_exists' };
  } catch {
    // global local.md doesn't exist, continue
  }

  // Check if example.md exists
  try {
    await access(examplePath);
    return {
      status: 'example_exists',
      message:
        'Prompt improver config not found. Copy .claude/prompt-improver.example.md to .claude/prompt-improver.local.md to customise settings.',
    };
  } catch {
    // example.md doesn't exist, create it
  }

  // Create example.md from bundled template
  try {
    // Read bundled template
    const templatePath = getBundledTemplatePath();
    const templateContent = await readFile(templatePath, 'utf-8');

    // Ensure .claude directory exists
    const claudeDir = dirname(examplePath);
    await mkdir(claudeDir, { recursive: true });

    // Write example config
    await writeFile(examplePath, templateContent, 'utf-8');

    return {
      status: 'example_created',
      message:
        'Created .claude/prompt-improver.example.md. Copy to .claude/prompt-improver.local.md to customise plugin settings.',
    };
  } catch (err) {
    return {
      status: 'setup_failed',
      message: `Failed to create config file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Cache entry for configuration
 */
interface ConfigCacheEntry {
  readonly config: Configuration;
  readonly mtimeMs: number;
}

/**
 * Configuration cache - keyed by absolute file path
 * Uses mtime to detect file changes and avoid re-parsing unchanged configs
 */
const configCache = new Map<string, ConfigCacheEntry>();

/**
 * Gets the modification time of a file in milliseconds
 * Returns -1 if file doesn't exist or can't be accessed
 */
async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.mtimeMs;
  } catch {
    return -1;
  }
}

/**
 * Clears the configuration cache
 * Useful for testing or forcing a reload
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// Pre-compiled regex patterns for YAML parsing (performance optimization)
const YAML_SECTION_PATTERN = /^(\w+):$/;
const YAML_NESTED_KV_PATTERN = /^\s+(\w+):\s*(.+)$/;
const YAML_TOP_LEVEL_KV_PATTERN = /^(\w+):\s*(.+)$/;

/**
 * Mutable parser state for the current YAML section being collected
 */
interface YamlSectionState {
  section: string | null;
  data: Record<string, unknown>;
  hasData: boolean;
}

/**
 * Saves the open section into the result if it has collected data
 * Returns true when a section was saved
 */
function saveOpenSection(result: Record<string, unknown>, state: YamlSectionState): boolean {
  if (state.section && state.hasData) {
    result[state.section] = state.data;
    return true;
  }
  return false;
}

/**
 * Processes a single frontmatter line, updating the result and section state
 */
function handleYamlLine(
  line: string,
  result: Record<string, unknown>,
  state: YamlSectionState
): void {
  // Cache trimmed line to avoid redundant trim() calls
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (trimmed.startsWith('#') || trimmed === '') {
    return;
  }

  // Check for section header (key followed by colon with no value)
  const sectionMatch = line.match(YAML_SECTION_PATTERN);
  if (sectionMatch?.[1]) {
    // Save previous section if exists
    saveOpenSection(result, state);
    state.section = sectionMatch[1];
    state.data = {};
    state.hasData = false;
    return;
  }

  // Check for indented key-value (nested in section)
  const nestedMatch = line.match(YAML_NESTED_KV_PATTERN);
  if (nestedMatch?.[1] && nestedMatch[2] && state.section) {
    state.data[nestedMatch[1]] = parseYamlValue(nestedMatch[2]);
    state.hasData = true;
    return;
  }

  // Check for top-level key-value
  const kvMatch = line.match(YAML_TOP_LEVEL_KV_PATTERN);
  if (kvMatch?.[1] && kvMatch[2]) {
    // Save any open section first
    if (saveOpenSection(result, state)) {
      state.section = null;
      state.data = {};
      state.hasData = false;
    }
    result[kvMatch[1]] = parseYamlValue(kvMatch[2]);
  }
}

/**
 * Parses YAML frontmatter from markdown content
 * Extracts key-value pairs between --- delimiters
 *
 * @param content - Markdown content with YAML frontmatter
 * @returns Parsed YAML object, or empty object if no frontmatter found
 * @throws Error with specific message if YAML syntax is invalid
 */
export function parseYamlFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const state: YamlSectionState = { section: null, data: {}, hasData: false };

  // Parse simple YAML key: value pairs
  for (const line of frontmatterMatch[1].split('\n')) {
    handleYamlLine(line, result, state);
  }

  // Save final section if exists
  saveOpenSection(result, state);

  return result;
}

/** Genres accepted for exemplar sections */
const EXEMPLAR_GENRES: readonly PromptGenre[] = [
  'fix',
  'investigate',
  'research',
  'build',
  'general',
];

/** Matches "## Exemplar: research" / "## exemplar research" style headings */
const EXEMPLAR_HEADING_PATTERN = /^##\s*exemplar[:\s]\s*(\w+)\s*$/i;

/**
 * Parses user exemplar sections from a markdown config body
 * A section starts at "## Exemplar: <genre>" and runs until the next "## " heading
 * Unknown genres are ignored; content is trimmed
 */
export function parseExemplarsFromBody(content: string): Partial<Record<PromptGenre, string>> {
  const exemplars: Partial<Record<PromptGenre, string>> = {};
  if (!content) {
    return exemplars;
  }

  const lines = content.split('\n');
  let currentGenre: PromptGenre | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentGenre) {
      const text = buffer.join('\n').trim();
      if (text.length > 0) {
        exemplars[currentGenre] = text;
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(EXEMPLAR_HEADING_PATTERN);
    if (headingMatch?.[1]) {
      flush();
      const genre = headingMatch[1].toLowerCase();
      currentGenre = (EXEMPLAR_GENRES as readonly string[]).includes(genre)
        ? (genre as PromptGenre)
        : null;
      continue;
    }
    // Any other "## " heading ends the current exemplar section
    if (/^##\s/.test(line)) {
      flush();
      currentGenre = null;
      continue;
    }
    if (currentGenre) {
      buffer.push(line);
    }
  }
  flush();

  return exemplars;
}

/**
 * Parses a YAML value string into appropriate type
 */
function parseYamlValue(value: string): unknown {
  const trimmed = value.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);

  // Quoted string - remove quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Plain string
  return trimmed;
}

/**
 * Coalesces camelCase and snake_case keys (?? semantics), keeping the value
 * only when the coalesced result is a number
 */
function coalescedNumber(primary: unknown, fallback: unknown): number | undefined {
  const value = primary ?? fallback;
  return typeof value === 'number' ? value : undefined;
}

/**
 * Coalesces camelCase and snake_case keys (?? semantics), keeping the value
 * only when the coalesced result is a string
 */
function coalescedString(primary: unknown, fallback: unknown): string | undefined {
  const value = primary ?? fallback;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Coalesces camelCase and snake_case keys (?? semantics), keeping the value
 * only when the coalesced result is a boolean
 */
function coalescedBoolean(primary: unknown, fallback: unknown): boolean | undefined {
  const value = primary ?? fallback;
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Returns the value if it is a boolean, otherwise undefined
 */
function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Returns the first argument that is a string, otherwise undefined
 * Unlike coalescedString, a wrongly-typed primary falls through to the fallback
 */
function firstString(primary: unknown, fallback: unknown): string | undefined {
  if (typeof primary === 'string') {
    return primary;
  }
  return typeof fallback === 'string' ? fallback : undefined;
}

/**
 * Returns the first argument that is a number, otherwise undefined
 * Unlike coalescedNumber, a wrongly-typed primary falls through to the fallback
 */
function firstNumber(primary: unknown, fallback: unknown): number | undefined {
  if (typeof primary === 'number') {
    return primary;
  }
  return typeof fallback === 'number' ? fallback : undefined;
}

/**
 * Returns the first argument that is a boolean, otherwise undefined
 * Unlike coalescedBoolean, a wrongly-typed primary falls through to the fallback
 */
function firstBoolean(primary: unknown, fallback: unknown): boolean | undefined {
  if (typeof primary === 'boolean') {
    return primary;
  }
  return typeof fallback === 'boolean' ? fallback : undefined;
}

/**
 * Returns the first argument that is a valid LogLevel string, otherwise undefined
 */
function firstLogLevel(primary: unknown, fallback: unknown): LogLevel | undefined {
  if (typeof primary === 'string' && isValidLogLevel(primary)) {
    return primary;
  }
  return typeof fallback === 'string' && isValidLogLevel(fallback) ? fallback : undefined;
}

/**
 * Sets a config key only when the value is defined
 */
function setIfDefined(config: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    config[key] = value;
  }
}

/**
 * Applies top-level scalar YAML fields onto the config object
 */
function applyScalarConfigFields(
  yaml: Record<string, unknown>,
  config: Record<string, unknown>
): void {
  setIfDefined(config, 'enabled', asBoolean(yaml.enabled));
  setIfDefined(
    config,
    'shortPromptThreshold',
    coalescedNumber(yaml.shortPromptThreshold, yaml.short_prompt_threshold)
  );
  setIfDefined(
    config,
    'compactionThreshold',
    coalescedNumber(yaml.compactionThreshold, yaml.compaction_threshold)
  );
  setIfDefined(
    config,
    'defaultSimpleModel',
    coalescedString(yaml.defaultSimpleModel, yaml.simple_model)
  );
  setIfDefined(
    config,
    'defaultComplexModel',
    coalescedString(yaml.defaultComplexModel, yaml.complex_model)
  );
  setIfDefined(config, 'forceImprove', coalescedBoolean(yaml.forceImprove, yaml.force_improve));
  setIfDefined(config, 'improverModel', coalescedString(yaml.improverModel, yaml.improver_model));

  const contextWindowTokens = coalescedNumber(yaml.contextWindowTokens, yaml.context_window_tokens);
  if (contextWindowTokens !== undefined && contextWindowTokens > 0) {
    config.contextWindowTokens = contextWindowTokens;
  }
}

/**
 * Converts a YAML integrations section to integration toggle values
 */
function yamlToIntegrations(src: Record<string, unknown>): Record<string, unknown> {
  return {
    git: asBoolean(src.git),
    lsp: asBoolean(src.lsp),
    spec: asBoolean(src.spec),
    memory: asBoolean(src.memory),
    session: asBoolean(src.session),
    dynamicDiscovery: asBoolean(src.dynamicDiscovery),
    pluginResources: asBoolean(src.pluginResources),
    projectShape: asBoolean(src.projectShape),
  };
}

/**
 * Converts a YAML logging section to logging config values
 * camelCase keys take precedence over snake_case equivalents
 */
function yamlToLogging(src: Record<string, unknown>): Record<string, unknown> {
  return {
    enabled: asBoolean(src.enabled),
    logFilePath: firstString(src.logFilePath, src.log_file_path),
    logLevel: firstLogLevel(src.logLevel, src.log_level),
    maxLogSizeMB: firstNumber(src.maxLogSizeMB, src.max_log_size_mb),
    maxLogAgeDays: firstNumber(src.maxLogAgeDays, src.max_log_age_days),
    displayImprovedPrompt: firstBoolean(src.displayImprovedPrompt, src.display_improved_prompt),
    useTimestampedLogs: firstBoolean(src.useTimestampedLogs, src.use_timestamped_logs),
  };
}

/**
 * Converts parsed YAML to Configuration shape
 */
function yamlToConfig(yaml: Record<string, unknown>): Partial<Configuration> {
  // Build config object - use type assertion to allow construction
  const config = {} as Record<string, unknown>;

  applyScalarConfigFields(yaml, config);

  // Parse integrations section
  if (yaml.integrations && typeof yaml.integrations === 'object') {
    config.integrations = yamlToIntegrations(yaml.integrations as Record<string, unknown>);
  }

  // Parse logging section
  if (yaml.logging && typeof yaml.logging === 'object') {
    config.logging = yamlToLogging(yaml.logging as Record<string, unknown>);
  }

  return config as Partial<Configuration>;
}

/**
 * Merges partial integration toggles with defaults
 */
function mergeIntegrations(
  defaults: IntegrationToggles,
  partial: Partial<Configuration>['integrations']
): IntegrationToggles {
  return {
    git: partial?.git ?? defaults.git,
    lsp: partial?.lsp ?? defaults.lsp,
    spec: partial?.spec ?? defaults.spec,
    memory: partial?.memory ?? defaults.memory,
    session: partial?.session ?? defaults.session,
    dynamicDiscovery: partial?.dynamicDiscovery ?? defaults.dynamicDiscovery,
    pluginResources: partial?.pluginResources ?? defaults.pluginResources,
    projectShape: partial?.projectShape ?? defaults.projectShape,
  };
}

/**
 * Merges partial logging config with defaults
 */
function mergeLogging(
  defaults: LoggingConfig,
  partial: Partial<Configuration>['logging']
): LoggingConfig {
  return {
    enabled: partial?.enabled ?? defaults.enabled,
    logFilePath: partial?.logFilePath ?? defaults.logFilePath,
    logLevel: partial?.logLevel ?? defaults.logLevel,
    maxLogSizeMB: partial?.maxLogSizeMB ?? defaults.maxLogSizeMB,
    maxLogAgeDays: partial?.maxLogAgeDays ?? defaults.maxLogAgeDays,
    displayImprovedPrompt: partial?.displayImprovedPrompt ?? defaults.displayImprovedPrompt,
    useTimestampedLogs: partial?.useTimestampedLogs ?? defaults.useTimestampedLogs,
  };
}

/**
 * Merges partial configuration with defaults
 */
function mergeConfig(defaults: Configuration, partial: Partial<Configuration>): Configuration {
  return {
    enabled: partial.enabled ?? defaults.enabled,
    forceImprove: partial.forceImprove ?? defaults.forceImprove,
    shortPromptThreshold: partial.shortPromptThreshold ?? defaults.shortPromptThreshold,
    compactionThreshold: partial.compactionThreshold ?? defaults.compactionThreshold,
    defaultSimpleModel: partial.defaultSimpleModel ?? defaults.defaultSimpleModel,
    defaultComplexModel: partial.defaultComplexModel ?? defaults.defaultComplexModel,
    improverModel: partial.improverModel ?? defaults.improverModel,
    ...((partial.contextWindowTokens ?? defaults.contextWindowTokens) !== undefined && {
      contextWindowTokens: partial.contextWindowTokens ?? defaults.contextWindowTokens,
    }),
    integrations: mergeIntegrations(defaults.integrations, partial.integrations),
    logging: mergeLogging(defaults.logging, partial.logging),
    ...((partial.exemplars ?? defaults.exemplars) && {
      exemplars: partial.exemplars ?? defaults.exemplars,
    }),
  };
}

/**
 * Loads configuration from file, merging with defaults
 * Uses mtime-based caching to avoid re-parsing unchanged files
 * Supports both markdown (with YAML frontmatter) and JSON formats
 * Returns defaults if file doesn't exist or is invalid
 */
export async function loadConfig(filePath: string): Promise<Configuration> {
  // Check if file exists (async)
  try {
    await access(filePath);
  } catch {
    return DEFAULT_CONFIG;
  }

  // Check mtime for cache validity
  const currentMtime = await getFileMtime(filePath);
  const cached = configCache.get(filePath);

  if (cached && cached.mtimeMs === currentMtime && currentMtime !== -1) {
    return cached.config;
  }

  try {
    const content = await readFile(filePath, 'utf-8');

    // Detect format by file extension or content
    const config = filePath.endsWith('.md')
      ? parseMarkdownConfig(filePath, content)
      : parseJsonConfig(filePath, content);

    if (config === null) {
      return DEFAULT_CONFIG;
    }

    // Cache the result with current mtime
    if (currentMtime !== -1) {
      configCache.set(filePath, { config, mtimeMs: currentMtime });
    }

    return config;
  } catch {
    // File read error - return defaults silently (file may not exist, which is OK)
    return DEFAULT_CONFIG;
  }
}

/**
 * Parses markdown config content (YAML frontmatter plus exemplar body)
 * Returns null and warns if parsing fails
 */
function parseMarkdownConfig(filePath: string, content: string): Configuration | null {
  try {
    const yaml = parseYamlFrontmatter(content);
    const partial = yamlToConfig(yaml);
    const exemplars = parseExemplarsFromBody(content);
    return mergeConfig(DEFAULT_CONFIG, {
      ...partial,
      ...(Object.keys(exemplars).length > 0 && { exemplars }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Warning: Failed to parse YAML frontmatter in ${filePath}: ${message}\nUsing default configuration.`
    );
    return null;
  }
}

/**
 * Parses legacy JSON config content
 * Returns null and warns if parsing fails
 */
function parseJsonConfig(filePath: string, content: string): Configuration | null {
  try {
    const parsed = JSON.parse(content) as Partial<Configuration>;
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Warning: Failed to parse JSON in ${filePath}: ${message}\nUsing default configuration.`
    );
    return null;
  }
}

/**
 * Path to the user-global config in the home .claude directory
 * Allows a single config to apply across all projects, mirroring how
 * claude-memory-plugin resolves its global local.md
 */
export function getGlobalConfigPath(homeDir: string = homedir()): string {
  return join(homeDir, '.claude', 'prompt-improver.local.md');
}

/**
 * Ordered config candidate paths: project-local first (most specific),
 * then the user-global home config as a fallback
 */
function getConfigCandidatePaths(baseDir: string, homeDir: string): string[] {
  return [
    ...CONFIG_PATHS.map((configPath) => join(baseDir, configPath)),
    getGlobalConfigPath(homeDir),
  ];
}

/**
 * Finds and loads configuration from standard locations
 * Checks project-local paths first, then the user-global ~/.claude config
 */
export async function loadConfigFromStandardPaths(
  baseDir = '.',
  homeDir: string = homedir()
): Promise<Configuration> {
  for (const fullPath of getConfigCandidatePaths(baseDir, homeDir)) {
    try {
      await access(fullPath);
      return await loadConfig(fullPath);
    } catch {}
  }
  return DEFAULT_CONFIG;
}

/**
 * Appends a range validation error when a defined value falls outside min-max
 */
function validateRange(
  errors: ConfigValidationError[],
  field: string,
  value: number | undefined,
  min: number,
  max: number
): void {
  if (value === undefined) {
    return;
  }
  if (value < min || value > max) {
    errors.push({
      field,
      message: `Must be between ${min} and ${max}`,
      value,
    });
  }
}

/**
 * Validates configuration values and returns array of errors
 */
export function validateConfig(config: Partial<Configuration>): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Validate shortPromptThreshold (1-100 tokens)
  // Range: 1-100 covers reasonable prompt lengths; <1 would disable feature, >100 is impractical
  validateRange(errors, 'shortPromptThreshold', config.shortPromptThreshold, 1, 100);

  // Validate compactionThreshold (0-100 percent)
  // Range: 0-100 represents percentage; <0 invalid, >100 impossible for percentage
  validateRange(errors, 'compactionThreshold', config.compactionThreshold, 0, 100);

  // Validate logging config if present
  if (config.logging) {
    // Validate maxLogSizeMB (1-1000 MB)
    // Range: 1 MB minimum for useful logs, 1000 MB (1 GB) maximum to prevent disk exhaustion
    validateRange(errors, 'logging.maxLogSizeMB', config.logging.maxLogSizeMB, 1, 1000);

    // Validate maxLogAgeDays (1-365 days)
    // Range: 1 day minimum for log retention, 365 days (1 year) maximum for practical rotation
    validateRange(errors, 'logging.maxLogAgeDays', config.logging.maxLogAgeDays, 1, 365);
  }

  return errors;
}

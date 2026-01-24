/**
 * Configuration loader for Claude Prompt Improver Plugin
 * Loads and validates user configuration from markdown files with YAML frontmatter
 * Similar to claude-memory-plugin's local.md pattern
 */
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Configuration, IntegrationToggles, LogLevel, LoggingConfig } from './types.ts';

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
export async function ensureConfigSetup(baseDir = '.'): Promise<ConfigSetupResult> {
  const localPath = join(baseDir, CONFIG_PATHS[0]);
  const examplePath = join(baseDir, EXAMPLE_CONFIG_PATH);

  // Check if local.md exists
  try {
    await access(localPath);
    return { status: 'local_exists' };
  } catch {
    // local.md doesn't exist, continue
  }

  // Check if example.md exists
  try {
    await access(examplePath);
    return {
      status: 'example_exists',
      message: 'Prompt improver config not found. Copy .claude/prompt-improver.example.md to .claude/prompt-improver.local.md to customise settings.',
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
      message: 'Created .claude/prompt-improver.example.md. Copy to .claude/prompt-improver.local.md to customise plugin settings.',
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

  const frontmatter = frontmatterMatch[1];
  const result: Record<string, unknown> = {};

  // Parse simple YAML key: value pairs
  const lines = frontmatter.split('\n');
  let currentSection: string | null = null;
  let currentSectionData: Record<string, unknown> = {};
  let sectionHasData = false;

  for (const line of lines) {
    // Cache trimmed line to avoid redundant trim() calls
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    // Check for section header (key followed by colon with no value)
    const sectionMatch = line.match(YAML_SECTION_PATTERN);
    if (sectionMatch?.[1]) {
      // Save previous section if exists
      if (currentSection && sectionHasData) {
        result[currentSection] = currentSectionData;
      }
      currentSection = sectionMatch[1];
      currentSectionData = {};
      sectionHasData = false;
      continue;
    }

    // Check for indented key-value (nested in section)
    const nestedMatch = line.match(YAML_NESTED_KV_PATTERN);
    if (nestedMatch?.[1] && nestedMatch[2] && currentSection) {
      const key = nestedMatch[1];
      const value = nestedMatch[2];
      currentSectionData[key] = parseYamlValue(value);
      sectionHasData = true;
      continue;
    }

    // Check for top-level key-value
    const kvMatch = line.match(YAML_TOP_LEVEL_KV_PATTERN);
    if (kvMatch?.[1] && kvMatch[2]) {
      // Save any open section first
      if (currentSection && sectionHasData) {
        result[currentSection] = currentSectionData;
        currentSection = null;
        currentSectionData = {};
        sectionHasData = false;
      }
      const key = kvMatch[1];
      const value = kvMatch[2];
      result[key] = parseYamlValue(value);
    }
  }

  // Save final section if exists
  if (currentSection && sectionHasData) {
    result[currentSection] = currentSectionData;
  }

  return result;
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
 * Converts parsed YAML to Configuration shape
 */
function yamlToConfig(yaml: Record<string, unknown>): Partial<Configuration> {
  // Build config object - use type assertion to allow construction
  const config = {} as Record<string, unknown>;

  if (typeof yaml.enabled === 'boolean') {
    config.enabled = yaml.enabled;
  }

  const shortThreshold = yaml.shortPromptThreshold ?? yaml.short_prompt_threshold;
  if (typeof shortThreshold === 'number') {
    config.shortPromptThreshold = shortThreshold;
  }

  const compactThreshold = yaml.compactionThreshold ?? yaml.compaction_threshold;
  if (typeof compactThreshold === 'number') {
    config.compactionThreshold = compactThreshold;
  }

  const simpleModel = yaml.defaultSimpleModel ?? yaml.simple_model;
  if (typeof simpleModel === 'string') {
    config.defaultSimpleModel = simpleModel;
  }

  const complexModel = yaml.defaultComplexModel ?? yaml.complex_model;
  if (typeof complexModel === 'string') {
    config.defaultComplexModel = complexModel;
  }

  const forceImprove = yaml.forceImprove ?? yaml.force_improve;
  if (typeof forceImprove === 'boolean') {
    config.forceImprove = forceImprove;
  }

  const improverModel = yaml.improverModel ?? yaml.improver_model;
  if (typeof improverModel === 'string') {
    config.improverModel = improverModel;
  }

  // Parse integrations section
  if (yaml.integrations && typeof yaml.integrations === 'object') {
    const src = yaml.integrations as Record<string, unknown>;
    config.integrations = {
      git: typeof src.git === 'boolean' ? src.git : undefined,
      lsp: typeof src.lsp === 'boolean' ? src.lsp : undefined,
      spec: typeof src.spec === 'boolean' ? src.spec : undefined,
      memory: typeof src.memory === 'boolean' ? src.memory : undefined,
      session: typeof src.session === 'boolean' ? src.session : undefined,
      dynamicDiscovery: typeof src.dynamicDiscovery === 'boolean' ? src.dynamicDiscovery : undefined,
    };
  }

  // Parse logging section
  if (yaml.logging && typeof yaml.logging === 'object') {
    const src = yaml.logging as Record<string, unknown>;
    config.logging = {
      enabled: typeof src.enabled === 'boolean' ? src.enabled : undefined,
      logFilePath:
        typeof src.logFilePath === 'string'
          ? src.logFilePath
          : typeof src.log_file_path === 'string'
            ? src.log_file_path
            : undefined,
      logLevel:
        typeof src.logLevel === 'string' && isValidLogLevel(src.logLevel)
          ? (src.logLevel as LogLevel)
          : typeof src.log_level === 'string' && isValidLogLevel(src.log_level)
            ? (src.log_level as LogLevel)
            : undefined,
      maxLogSizeMB:
        typeof src.maxLogSizeMB === 'number'
          ? src.maxLogSizeMB
          : typeof src.max_log_size_mb === 'number'
            ? src.max_log_size_mb
            : undefined,
      maxLogAgeDays:
        typeof src.maxLogAgeDays === 'number'
          ? src.maxLogAgeDays
          : typeof src.max_log_age_days === 'number'
            ? src.max_log_age_days
            : undefined,
      displayImprovedPrompt:
        typeof src.displayImprovedPrompt === 'boolean'
          ? src.displayImprovedPrompt
          : typeof src.display_improved_prompt === 'boolean'
            ? src.display_improved_prompt
            : undefined,
      useTimestampedLogs:
        typeof src.useTimestampedLogs === 'boolean'
          ? src.useTimestampedLogs
          : typeof src.use_timestamped_logs === 'boolean'
            ? src.use_timestamped_logs
            : undefined,
    };
  }

  return config as Partial<Configuration>;
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
    integrations: {
      git: partial.integrations?.git ?? defaults.integrations.git,
      lsp: partial.integrations?.lsp ?? defaults.integrations.lsp,
      spec: partial.integrations?.spec ?? defaults.integrations.spec,
      memory: partial.integrations?.memory ?? defaults.integrations.memory,
      session: partial.integrations?.session ?? defaults.integrations.session,
      dynamicDiscovery: partial.integrations?.dynamicDiscovery ?? defaults.integrations.dynamicDiscovery,
      pluginResources: partial.integrations?.pluginResources ?? defaults.integrations.pluginResources,
    },
    logging: {
      enabled: partial.logging?.enabled ?? defaults.logging.enabled,
      logFilePath: partial.logging?.logFilePath ?? defaults.logging.logFilePath,
      logLevel: partial.logging?.logLevel ?? defaults.logging.logLevel,
      maxLogSizeMB: partial.logging?.maxLogSizeMB ?? defaults.logging.maxLogSizeMB,
      maxLogAgeDays: partial.logging?.maxLogAgeDays ?? defaults.logging.maxLogAgeDays,
      displayImprovedPrompt:
        partial.logging?.displayImprovedPrompt ?? defaults.logging.displayImprovedPrompt,
      useTimestampedLogs:
        partial.logging?.useTimestampedLogs ?? defaults.logging.useTimestampedLogs,
    },
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
    let config: Configuration;

    // Detect format by file extension or content
    if (filePath.endsWith('.md')) {
      try {
        const yaml = parseYamlFrontmatter(content);
        const partial = yamlToConfig(yaml);
        config = mergeConfig(DEFAULT_CONFIG, partial);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to parse YAML frontmatter in ${filePath}: ${message}\nUsing default configuration.`
        );
        return DEFAULT_CONFIG;
      }
    } else {
      // Legacy JSON format
      try {
        const parsed = JSON.parse(content) as Partial<Configuration>;
        config = mergeConfig(DEFAULT_CONFIG, parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to parse JSON in ${filePath}: ${message}\nUsing default configuration.`
        );
        return DEFAULT_CONFIG;
      }
    }

    // Cache the result with current mtime
    if (currentMtime !== -1) {
      configCache.set(filePath, { config, mtimeMs: currentMtime });
    }

    return config;
  } catch (error) {
    // File read error - return defaults silently (file may not exist, which is OK)
    return DEFAULT_CONFIG;
  }
}

/**
 * Finds and loads configuration from standard locations
 * Checks paths in order of precedence
 */
export async function loadConfigFromStandardPaths(baseDir = '.'): Promise<Configuration> {
  for (const configPath of CONFIG_PATHS) {
    const fullPath = join(baseDir, configPath);
    try {
      await access(fullPath);
      return await loadConfig(fullPath);
    } catch {}
  }
  return DEFAULT_CONFIG;
}

/**
 * Validates configuration values and returns array of errors
 */
export function validateConfig(config: Partial<Configuration>): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Validate shortPromptThreshold (1-100 tokens)
  // Range: 1-100 covers reasonable prompt lengths; <1 would disable feature, >100 is impractical
  if (config.shortPromptThreshold !== undefined) {
    if (config.shortPromptThreshold < 1 || config.shortPromptThreshold > 100) {
      errors.push({
        field: 'shortPromptThreshold',
        message: 'Must be between 1 and 100',
        value: config.shortPromptThreshold,
      });
    }
  }

  // Validate compactionThreshold (0-100 percent)
  // Range: 0-100 represents percentage; <0 invalid, >100 impossible for percentage
  if (config.compactionThreshold !== undefined) {
    if (config.compactionThreshold < 0 || config.compactionThreshold > 100) {
      errors.push({
        field: 'compactionThreshold',
        message: 'Must be between 0 and 100',
        value: config.compactionThreshold,
      });
    }
  }

  // Validate logging config if present
  if (config.logging) {
    // Validate maxLogSizeMB (1-1000 MB)
    // Range: 1 MB minimum for useful logs, 1000 MB (1 GB) maximum to prevent disk exhaustion
    if (config.logging.maxLogSizeMB !== undefined) {
      if (config.logging.maxLogSizeMB < 1 || config.logging.maxLogSizeMB > 1000) {
        errors.push({
          field: 'logging.maxLogSizeMB',
          message: 'Must be between 1 and 1000',
          value: config.logging.maxLogSizeMB,
        });
      }
    }

    // Validate maxLogAgeDays (1-365 days)
    // Range: 1 day minimum for log retention, 365 days (1 year) maximum for practical rotation
    if (config.logging.maxLogAgeDays !== undefined) {
      if (config.logging.maxLogAgeDays < 1 || config.logging.maxLogAgeDays > 365) {
        errors.push({
          field: 'logging.maxLogAgeDays',
          message: 'Must be between 1 and 365',
          value: config.logging.maxLogAgeDays,
        });
      }
    }
  }

  return errors;
}

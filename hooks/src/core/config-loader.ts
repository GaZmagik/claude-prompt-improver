/**
 * Configuration loader for Claude Prompt Improver Plugin
 * Loads and validates user configuration with sensible defaults
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Configuration, IntegrationToggles, LoggingConfig } from './types.ts';

/**
 * Validation error for configuration fields
 */
export interface ConfigValidationError {
  readonly field: string;
  readonly message: string;
  readonly value: unknown;
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
};

/**
 * Default logging configuration
 */
const DEFAULT_LOGGING: LoggingConfig = {
  enabled: true,
  logFilePath: '.claude/logs/prompt-improver-latest.log',
  maxLogSizeMB: 10,
  maxLogAgeDays: 7,
  displayImprovedPrompt: true,
};

/**
 * Default configuration with sensible values
 */
export const DEFAULT_CONFIG: Configuration = {
  enabled: true,
  shortPromptThreshold: 10,
  compactionThreshold: 5,
  defaultSimpleModel: 'haiku',
  defaultComplexModel: 'sonnet',
  integrations: DEFAULT_INTEGRATIONS,
  logging: DEFAULT_LOGGING,
};

/**
 * Merges partial configuration with defaults
 */
function mergeConfig(
  defaults: Configuration,
  partial: Partial<Configuration>
): Configuration {
  return {
    enabled: partial.enabled ?? defaults.enabled,
    shortPromptThreshold: partial.shortPromptThreshold ?? defaults.shortPromptThreshold,
    compactionThreshold: partial.compactionThreshold ?? defaults.compactionThreshold,
    defaultSimpleModel: partial.defaultSimpleModel ?? defaults.defaultSimpleModel,
    defaultComplexModel: partial.defaultComplexModel ?? defaults.defaultComplexModel,
    integrations: {
      git: partial.integrations?.git ?? defaults.integrations.git,
      lsp: partial.integrations?.lsp ?? defaults.integrations.lsp,
      spec: partial.integrations?.spec ?? defaults.integrations.spec,
      memory: partial.integrations?.memory ?? defaults.integrations.memory,
      session: partial.integrations?.session ?? defaults.integrations.session,
    },
    logging: {
      enabled: partial.logging?.enabled ?? defaults.logging.enabled,
      logFilePath: partial.logging?.logFilePath ?? defaults.logging.logFilePath,
      maxLogSizeMB: partial.logging?.maxLogSizeMB ?? defaults.logging.maxLogSizeMB,
      maxLogAgeDays: partial.logging?.maxLogAgeDays ?? defaults.logging.maxLogAgeDays,
      displayImprovedPrompt:
        partial.logging?.displayImprovedPrompt ?? defaults.logging.displayImprovedPrompt,
    },
  };
}

/**
 * Loads configuration from file, merging with defaults
 * Returns defaults if file doesn't exist or is invalid
 */
export function loadConfig(filePath: string): Configuration {
  if (!existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<Configuration>;

    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch {
    // Invalid JSON or read error - return defaults
    return DEFAULT_CONFIG;
  }
}

/**
 * Validates configuration values and returns array of errors
 */
export function validateConfig(config: Partial<Configuration>): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Validate shortPromptThreshold (1-100)
  if (config.shortPromptThreshold !== undefined) {
    if (config.shortPromptThreshold < 1 || config.shortPromptThreshold > 100) {
      errors.push({
        field: 'shortPromptThreshold',
        message: 'Must be between 1 and 100',
        value: config.shortPromptThreshold,
      });
    }
  }

  // Validate compactionThreshold (0-100)
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
    // Validate maxLogSizeMB (1-1000)
    if (config.logging.maxLogSizeMB !== undefined) {
      if (config.logging.maxLogSizeMB < 1 || config.logging.maxLogSizeMB > 1000) {
        errors.push({
          field: 'logging.maxLogSizeMB',
          message: 'Must be between 1 and 1000',
          value: config.logging.maxLogSizeMB,
        });
      }
    }

    // Validate maxLogAgeDays (1-365)
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

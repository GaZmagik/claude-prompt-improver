/**
 * Error handler for Claude Prompt Improver Plugin
 * Ensures graceful fallback to original prompt on any error
 */
import type { BypassReason, HookOutput } from './types.ts';

/**
 * Processing phases where errors can occur
 */
export type ErrorPhase = 'classification' | 'improvement' | 'context_gathering' | 'unknown';

/**
 * Context for handling an error
 */
export interface ErrorContext {
  readonly originalPrompt: string;
  readonly error: Error | unknown;
  readonly phase: ErrorPhase;
}

/**
 * Result of error handling
 */
export interface ErrorResult {
  readonly output: HookOutput;
  readonly bypassReason: BypassReason;
  readonly errorMessage: string;
  readonly errorStack?: string;
  readonly phase: ErrorPhase;
  readonly timestamp: number;
}

/**
 * Creates a minimal passthrough output that allows the prompt to continue unchanged
 */
export function createPassthroughOutput(): HookOutput {
  return { continue: true };
}

/**
 * Extracts error message from various error types
 */
function getErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error === null || error === undefined) {
    return 'Unknown error (null or undefined)';
  }
  return String(error);
}

/**
 * Extracts error stack from Error objects
 */
function getErrorStack(error: Error | unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Maps error phase to appropriate bypass reason
 */
function phaseToBypassReason(phase: ErrorPhase): BypassReason {
  switch (phase) {
    case 'classification':
      return 'classification_failed';
    case 'improvement':
      return 'improvement_failed';
    case 'context_gathering':
      return 'improvement_failed'; // Context failures fall back to improvement_failed
    default:
      return 'classification_failed';
  }
}

/**
 * Handles any error by returning a graceful passthrough
 * Never blocks the user's prompt - always allows continuation
 */
export function handleError(context: ErrorContext): ErrorResult {
  const { error, phase } = context;
  const errorStack = getErrorStack(error);

  const result: ErrorResult = {
    output: createPassthroughOutput(),
    bypassReason: phaseToBypassReason(phase),
    errorMessage: getErrorMessage(error),
    phase,
    timestamp: Date.now(),
  };

  // Only include errorStack if it exists (exactOptionalPropertyTypes compliance)
  if (errorStack !== undefined) {
    return { ...result, errorStack };
  }

  return result;
}

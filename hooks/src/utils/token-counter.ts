/**
 * Token counter using whitespace-split heuristic
 * Provides fast, approximate token counting for bypass decisions
 */
import { SHORT_PROMPT_THRESHOLD_TOKENS } from '../core/constants.ts';

/**
 * Counts tokens in a string using whitespace-split heuristic
 * Fast approximation for bypass detection (not exact tokenisation)
 */
export function countTokens(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  // After trim(), split(/\s+/) never produces empty strings
  return trimmed.split(/\s+/).length;
}

/**
 * Checks if a prompt is considered "short" based on token count
 * Short prompts are bypassed as they're likely commands or simple queries
 */
export function isShortPrompt(prompt: string): boolean {
  const tokenCount = countTokens(prompt);
  return tokenCount <= SHORT_PROMPT_THRESHOLD_TOKENS;
}

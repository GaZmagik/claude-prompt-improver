/**
 * Token counter using whitespace-split heuristic
 * Provides fast, approximate token counting for bypass decisions
 */
import { SHORT_PROMPT_THRESHOLD_TOKENS } from '../core/constants.ts';

/**
 * Counts tokens in a string using whitespace-split heuristic
 * Fast approximation for bypass detection (not exact tokenisation)
 * O(1) space - counts whitespace transitions without creating arrays
 */
export function countTokens(text: string): number {
  const len = text.length;
  if (len === 0) return 0;

  let count = 0;
  let inWord = false;

  for (let i = 0; i < len; i++) {
    const char = text.charCodeAt(i);
    // Check for whitespace: space (32), tab (9), newline (10), carriage return (13)
    const isWhitespace = char === 32 || char === 9 || char === 10 || char === 13;

    if (isWhitespace) {
      inWord = false;
    } else if (!inWord) {
      // Transition from whitespace to non-whitespace = new word
      inWord = true;
      count++;
    }
  }

  return count;
}

/**
 * Checks if a prompt is considered "short" based on token count
 * Short prompts are bypassed as they're likely commands or simple queries
 * @param prompt - The prompt to check
 * @param threshold - Token threshold (defaults to SHORT_PROMPT_THRESHOLD_TOKENS if not provided)
 */
export function isShortPrompt(prompt: string, threshold?: number): boolean {
  const tokenCount = countTokens(prompt);
  const effectiveThreshold = threshold ?? SHORT_PROMPT_THRESHOLD_TOKENS;
  return tokenCount <= effectiveThreshold;
}

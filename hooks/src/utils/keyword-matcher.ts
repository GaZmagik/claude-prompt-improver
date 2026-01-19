/**
 * Shared keyword matching utilities
 * Used by skill-matcher, agent-suggester, and memory-plugin
 */

/**
 * Result of matching keywords against text
 */
export interface KeywordMatchResult {
  readonly matchedKeywords: readonly string[];
  readonly score: number;
}

/**
 * Matches keywords against text (case-insensitive)
 * Returns the matched keywords and a score
 *
 * @param text - The text to search in
 * @param keywords - The keywords to search for
 * @returns Matched keywords and score (number of matches)
 */
export function matchKeywords(text: string, keywords: readonly string[]): KeywordMatchResult {
  const textLower = text.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of keywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    matchedKeywords,
    score: matchedKeywords.length,
  };
}

/**
 * Result of matching an item by keywords
 */
export interface ItemMatchResult<T> {
  readonly item: T;
  readonly matchedKeywords: readonly string[];
  readonly score: number;
}

/**
 * Matches items with keywords against text
 * Returns items that have at least one matching keyword, sorted by relevance
 *
 * @param text - The text to search in
 * @param items - Items with keywords to match
 * @param getKeywords - Function to extract keywords from an item
 * @returns Matched items with their matched keywords and scores
 */
export function matchItemsByKeywords<T>(
  text: string,
  items: readonly T[],
  getKeywords: (item: T) => readonly string[]
): ItemMatchResult<T>[] {
  const textLower = text.toLowerCase();
  const results: ItemMatchResult<T>[] = [];

  for (const item of items) {
    const keywords = getKeywords(item);
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      results.push({
        item,
        matchedKeywords,
        score: matchedKeywords.length,
      });
    }
  }

  // Sort by score (most relevant first)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Prompt genre classification
 * A cheap keyword heuristic (no API call) that decides which guideline block
 * and worked example the improvement template includes
 */
import type { PromptGenre } from '../core/types.ts';

export type { PromptGenre };

/**
 * Keyword patterns per genre. Each match scores 1; the highest-scoring genre
 * wins, with ties broken by the order genres appear in GENRE_PATTERNS
 * (more distinctive genres first)
 */
const GENRE_PATTERNS: readonly (readonly [Exclude<PromptGenre, 'general'>, readonly RegExp[]])[] = [
  [
    'research',
    [
      /\bresearch\b/i,
      /\bfind out\b/i,
      /\bis anyone\b/i,
      /\bmaintained\b/i,
      /\bdeprecat/i,
      /\bfact-?check/i,
      /\bsearch the web\b/i,
      /\bweb search\b/i,
      /\blook up\b/i,
      /\bvendor/i,
      /\bcommunity\b/i,
      /\bverify (?:the |these )?claims?\b/i,
    ],
  ],
  [
    'investigate',
    [
      /\baudit\b/i,
      /\binvestigat/i,
      /\btrace\b/i,
      /\bmap (?:out |every |all )/i,
      /\bdiagnos/i,
      /\bflag\b/i,
      /\breview\b/i,
      /\bcheck (?:all|every|each|the|our|whether|if)\b/i,
      /\bfind (?:all|every|each|where)\b/i,
      /\bwhere (?:does|is|are|do)\b/i,
      /\bwhy (?:does|is|are|do)\b/i,
      /\bgo through\b/i,
    ],
  ],
  [
    'fix',
    [
      /\bfix\b/i,
      /\bbug\b/i,
      /\bbroken\b/i,
      /\bcrash/i,
      /\bfailing\b/i,
      /\bregression\b/i,
      /\bdoesn'?t work/i,
      /\bnot working\b/i,
    ],
  ],
  [
    'build',
    [
      /\badd\b/i,
      /\bimplement\b/i,
      /\bbuild\b/i,
      /\bcreate\b/i,
      /\bextend\b/i,
      /\bmigrate\b/i,
      /\brefactor\b/i,
      /\brename\b/i,
      /\bwire\b/i,
      /\bintegrate\b/i,
      /\bset up\b/i,
      /\bwrite (?:a|the|an|some)\b/i,
      /\bmake (?:the|it|them|this|these|a|an)\b/i,
      /\benable\b/i,
      /\bsupport\b/i,
    ],
  ],
];

/**
 * Classifies a prompt into the genre whose keywords match most strongly
 * Returns 'general' when nothing matches (conversational, short, or unusual prompts)
 */
export function classifyPromptGenre(prompt: string): PromptGenre {
  if (!prompt || prompt.trim().length === 0) {
    return 'general';
  }

  let best: PromptGenre = 'general';
  let bestScore = 0;

  for (const [genre, patterns] of GENRE_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        score += 1;
      }
    }
    // Strict > keeps earlier (more distinctive) genres on ties
    if (score > bestScore) {
      best = genre;
      bestScore = score;
    }
  }

  return best;
}

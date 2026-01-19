/**
 * Message formatter for user-facing visibility messages
 * Formats system messages showing prompt improvement status
 */

import type { BypassReason, VisibilityInfo } from '../core/types.ts';

/**
 * Format visibility information into user-facing system message
 */
export function formatSystemMessage(info: VisibilityInfo): string {
  switch (info.status) {
    case 'bypassed':
      return formatBypassMessage(info.bypassReason);
    case 'applied':
      return formatAppliedMessage(
        info.tokensBefore!,
        info.tokensAfter!,
        info.summary,
        info.latencyMs
      );
    case 'failed':
      return formatFailureMessage(info.errorHint);
  }
}

/**
 * Format bypass message with reason
 */
function formatBypassMessage(reason?: BypassReason): string {
  const reasonText = getBypassReasonText(reason);
  return `⏭️  Prompt unchanged (${reasonText})`;
}

/**
 * Get human-readable text for bypass reason
 */
function getBypassReasonText(reason?: BypassReason): string {
  switch (reason) {
    case 'short_prompt':
      return 'too short for improvement';
    case 'skip_tag':
      return 'skip tag detected';
    case 'low_context':
      return 'context budget low';
    case 'forked_session':
      return 'forked session';
    case 'plugin_disabled':
      return 'plugin disabled';
    case 'classification_failed':
      return 'classification failed';
    case 'improvement_failed':
      return 'improvement failed';
    default:
      return 'not improved';
  }
}

/**
 * Format applied improvement message
 */
function formatAppliedMessage(
  tokensBefore: number,
  tokensAfter: number,
  summary?: readonly string[],
  latencyMs?: number
): string {
  let message = `🎯 Prompt improved`;

  // Add token change
  message += `\n   Tokens: ${tokensBefore} → ${tokensAfter}`;

  // Add summary bullets if provided
  if (summary && summary.length > 0) {
    message += '\n   Changes:';
    for (const item of summary) {
      message += `\n   • ${item}`;
    }
  }

  // Add latency if provided
  if (latencyMs !== undefined) {
    const latencySec = (Math.round((latencyMs / 1000) * 10) / 10).toFixed(1);
    message += `\n   (${latencySec}s)`;
  }

  return message;
}

/**
 * Format failure message with optional error hint
 */
function formatFailureMessage(errorHint?: string): string {
  let message = '⚠️  Improvement failed, using original prompt';

  if (errorHint) {
    message += `\n   ${errorHint}`;
  }

  return message;
}

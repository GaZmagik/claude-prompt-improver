/**
 * Path validation utilities for dynamic discovery
 * Prevents path traversal attacks and dangerous path patterns
 */

/**
 * Result of path validation
 */
export interface PathValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Validates a discovery path to prevent path traversal and injection attacks
 * @param path - The path to validate
 * @returns true if path is safe, false otherwise
 */
export function isValidDiscoveryPath(path: string | undefined): boolean {
  // Empty or undefined is valid (will use defaults)
  if (!path || path === '') {
    return true;
  }

  // Reject path traversal sequences
  if (path.includes('..')) {
    return false;
  }

  // Reject null bytes (path truncation attack)
  if (path.includes('\0')) {
    return false;
  }

  // Reject newlines (header injection)
  if (path.includes('\n') || path.includes('\r')) {
    return false;
  }

  // Reject shell metacharacters
  const shellMetachars = ['$', '`', ';', '|', '&', '>', '<', '!', '{', '}', '[', ']', '(', ')'];
  for (const char of shellMetachars) {
    if (path.includes(char)) {
      return false;
    }
  }

  // Reject zero-width and special unicode characters
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F\u200B-\u200D\u2028\u2029\uFEFF]/.test(path)) {
    return false;
  }

  // Only allow safe characters: alphanumeric, hyphens, underscores, forward slashes, dots, colons (Windows)
  if (!/^[a-zA-Z0-9/:._-]*$/.test(path)) {
    return false;
  }

  return true;
}

/**
 * Validates a discovery path and returns detailed error information
 * @param path - The path to validate
 * @returns Validation result with error details if invalid
 */
export function validateDiscoveryPath(path: string | undefined): PathValidationResult {
  if (!path || path === '') {
    return { valid: true };
  }

  if (path.includes('..')) {
    return { valid: false, error: 'Path contains traversal sequence (..)' };
  }

  if (path.includes('\0')) {
    return { valid: false, error: 'Path contains null byte injection' };
  }

  if (path.includes('\n') || path.includes('\r')) {
    return { valid: false, error: 'Path contains newline character' };
  }

  const shellMetachars = ['$', '`', ';', '|', '&', '>', '<', '!', '{', '}', '[', ']', '(', ')'];
  for (const char of shellMetachars) {
    if (path.includes(char)) {
      return { valid: false, error: `Path contains dangerous shell character: ${char}` };
    }
  }

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F\u200B-\u200D\u2028\u2029\uFEFF]/.test(path)) {
    return { valid: false, error: 'Path contains dangerous unicode character' };
  }

  if (!/^[a-zA-Z0-9/:._-]*$/.test(path)) {
    return { valid: false, error: 'Path contains invalid character' };
  }

  return { valid: true };
}

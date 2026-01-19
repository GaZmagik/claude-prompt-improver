/**
 * Shared file reading utilities
 * Provides helpers for reading files with mock filesystem support for testing
 */
import { existsSync, readFileSync } from 'node:fs';

/**
 * Reads a file from mock or real filesystem
 *
 * @param path - Path to the file to read
 * @param mockFs - Optional mock filesystem for testing (maps path to content)
 * @returns File content as string, or null if file doesn't exist or read fails
 */
export function readFileSyncSafe(
  path: string,
  mockFs?: Record<string, string | null>
): string | null {
  // Use mock filesystem if provided
  if (mockFs) {
    return mockFs[path] ?? null;
  }

  // Read from real filesystem
  try {
    if (!existsSync(path)) {
      return null;
    }
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

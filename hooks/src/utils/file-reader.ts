/**
 * Shared file reading utilities
 * Provides helpers for reading files with mock filesystem support for testing
 */
import { existsSync, readFileSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';

/**
 * Reads a file from mock or real filesystem (synchronous)
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

/**
 * Reads a file from mock or real filesystem (asynchronous)
 *
 * @param path - Path to the file to read
 * @param mockFs - Optional mock filesystem for testing (maps path to content)
 * @returns File content as string, or null if file doesn't exist or read fails
 */
export async function readFileAsync(
  path: string,
  mockFs?: Record<string, string | null>
): Promise<string | null> {
  // Use mock filesystem if provided
  if (mockFs) {
    return mockFs[path] ?? null;
  }

  // Read from real filesystem
  try {
    await access(path);
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Checks if a path exists (asynchronous)
 */
export async function pathExistsAsync(
  path: string,
  mockFs?: Record<string, string | null>
): Promise<boolean> {
  if (mockFs) {
    return path in mockFs;
  }

  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

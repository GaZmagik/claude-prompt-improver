/**
 * Directory scanner for dynamic discovery
 * Scans directories for markdown files with timeout and error handling
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Default scan timeout in milliseconds */
export const DEFAULT_SCAN_TIMEOUT_MS = 2000;

/**
 * Mock directory entry for testing
 */
export interface MockDirectoryEntry {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}

/**
 * Mock directory for testing
 */
export interface MockDirectory {
  readonly type: 'directory' | 'file';
  readonly entries?: readonly MockDirectoryEntry[];
  readonly _error?: 'ENOENT' | 'EACCES' | 'ENOTDIR';
  readonly _delay?: number;
  readonly _partialOnTimeout?: boolean;
}

/**
 * Options for directory scanning
 */
export interface DirectoryScannerOptions {
  /** File extensions to include (default: ['.md']) */
  readonly extensions?: readonly string[];
  /** Timeout in milliseconds (default: 2000) */
  readonly timeoutMs?: number;
  /** Mock filesystem for testing */
  readonly _mockFileSystem?: Record<string, MockDirectory>;
}

/**
 * Result of directory scan
 */
export interface DirectoryScanResult {
  readonly success: boolean;
  readonly files: readonly string[];
  readonly error?: 'ENOENT' | 'EACCES' | 'ENOTDIR' | 'TIMEOUT' | 'UNKNOWN';
  readonly timedOut?: boolean;
}

/**
 * Delays execution for testing
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scans a directory for files with specified extensions
 * @param dirPath - Directory path to scan
 * @param options - Scan options
 * @returns Scan result with file paths
 */
export async function scanDirectory(
  dirPath: string,
  options: DirectoryScannerOptions = {}
): Promise<DirectoryScanResult> {
  const { extensions = ['.md'], timeoutMs = DEFAULT_SCAN_TIMEOUT_MS, _mockFileSystem } = options;

  // Use mock filesystem if provided
  if (_mockFileSystem) {
    return scanMockDirectory(dirPath, extensions, timeoutMs, _mockFileSystem);
  }

  // Real filesystem scan
  return scanRealDirectory(dirPath, extensions, timeoutMs);
}

/**
 * Scans mock filesystem for testing
 */
async function scanMockDirectory(
  dirPath: string,
  extensions: readonly string[],
  timeoutMs: number,
  mockFs: Record<string, MockDirectory>
): Promise<DirectoryScanResult> {
  // Normalise path (ensure trailing slash for directory lookup)
  const normalizedPath = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  const mockDir = mockFs[normalizedPath] ?? mockFs[dirPath];

  // Check if directory exists in mock
  if (!mockDir) {
    return { success: false, files: [], error: 'ENOENT' };
  }

  // Check for mock errors
  if (mockDir._error) {
    return { success: false, files: [], error: mockDir._error };
  }

  // Simulate delay if specified
  if (mockDir._delay) {
    const scanPromise = (async () => {
      await delay(mockDir._delay!);
      return filterMockEntries(normalizedPath, mockDir, extensions);
    })();

    const timeoutPromise = (async () => {
      await delay(timeoutMs);
      // Return partial results if configured
      if (mockDir._partialOnTimeout && mockDir.entries) {
        return {
          success: false,
          files: mockDir.entries
            .filter((e) => e.isFile && extensions.some((ext) => e.name.endsWith(ext)))
            .map((e) => join(normalizedPath, e.name)),
          timedOut: true,
        };
      }
      return { success: false, files: [] as string[], timedOut: true };
    })();

    return Promise.race([scanPromise, timeoutPromise]);
  }

  return filterMockEntries(normalizedPath, mockDir, extensions);
}

/**
 * Filters mock directory entries by extension
 */
function filterMockEntries(
  dirPath: string,
  mockDir: MockDirectory,
  extensions: readonly string[]
): DirectoryScanResult {
  if (!mockDir.entries) {
    return { success: true, files: [] };
  }

  const files = mockDir.entries
    .filter((entry) => entry.isFile && extensions.some((ext) => entry.name.endsWith(ext)))
    .map((entry) => join(dirPath, entry.name));

  return { success: true, files };
}

/**
 * Scans real filesystem with timeout
 */
async function scanRealDirectory(
  dirPath: string,
  extensions: readonly string[],
  timeoutMs: number
): Promise<DirectoryScanResult> {
  const scanPromise = (async (): Promise<DirectoryScanResult> => {
    try {
      // Check if path exists and is a directory
      const stats = await stat(dirPath);
      if (!stats.isDirectory()) {
        return { success: false, files: [], error: 'ENOTDIR' };
      }

      // Read directory with file types
      const entries = await readdir(dirPath, { withFileTypes: true });

      // Filter by extension and build absolute paths
      const files = entries
        .filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
        .map((entry) => join(dirPath, entry.name));

      return { success: true, files };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return { success: false, files: [], error: 'ENOENT' };
      }
      if (error.code === 'EACCES') {
        return { success: false, files: [], error: 'EACCES' };
      }
      if (error.code === 'ENOTDIR') {
        return { success: false, files: [], error: 'ENOTDIR' };
      }
      return { success: false, files: [], error: 'UNKNOWN' };
    }
  })();

  const timeoutPromise = (async (): Promise<DirectoryScanResult> => {
    await delay(timeoutMs);
    return { success: false, files: [], timedOut: true, error: 'TIMEOUT' };
  })();

  return Promise.race([scanPromise, timeoutPromise]);
}

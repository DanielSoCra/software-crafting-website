// src/lib/deliverables.ts
import path from 'node:path';
import fs from 'node:fs';

const PORTAL_ASSETS_BASE = '/var/www/portal-assets';

/**
 * Resolve a deliverable file path safely.
 * Returns the absolute path on disk, or null if the path escapes the client directory.
 */
export function resolveDeliverablePath(clientSlug: string, filePath: string): string | null {
  const clientBase = path.join(PORTAL_ASSETS_BASE, clientSlug);
  const resolved = path.resolve(clientBase, filePath);

  // Security: ensure resolved path is within the client's directory
  if (!resolved.startsWith(clientBase + '/') && resolved !== clientBase) {
    return null;
  }

  // Symlink defense: verify real path is also within client directory
  try {
    const real = fs.realpathSync(resolved);
    const realBase = fs.realpathSync(clientBase);
    if (!real.startsWith(realBase + '/') && real !== realBase) {
      return null;
    }
  } catch {
    // File doesn't exist yet — resolve-only check is sufficient
  }

  return resolved;
}

/**
 * Check if a deliverable file exists on disk.
 */
export function deliverableFileExists(clientSlug: string, filePath: string): boolean {
  const resolved = resolveDeliverablePath(clientSlug, filePath);
  if (!resolved) return false;
  try {
    return fs.existsSync(resolved);
  } catch {
    return false;
  }
}

/**
 * Read a deliverable file from disk.
 */
export function readDeliverableFile(clientSlug: string, filePath: string): Buffer | null {
  const resolved = resolveDeliverablePath(clientSlug, filePath);
  if (!resolved) return null;
  try {
    return fs.readFileSync(resolved);
  } catch {
    return null;
  }
}

/**
 * List files in a deliverable directory (non-recursive).
 */
export function listDeliverableFiles(clientSlug: string, dirPath: string): string[] {
  const resolved = resolveDeliverablePath(clientSlug, dirPath);
  if (!resolved) return [];
  try {
    if (!fs.statSync(resolved).isDirectory()) return [];
    return fs.readdirSync(resolved).filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
}

/**
 * Get MIME type from file extension.
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

/**
 * Build the X-Accel-Redirect path for nginx internal redirect.
 */
export function buildAccelRedirectPath(clientSlug: string, filePath: string): string {
  return `/internal-assets/${clientSlug}/${filePath}`;
}

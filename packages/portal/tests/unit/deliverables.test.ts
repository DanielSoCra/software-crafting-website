import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDeliverablePath } from '@/lib/deliverables';

/**
 * resolveDeliverablePath is the single line of defense between a user-provided
 * path segment (from `/portal/deliverables/{type}/{...rest}`) and disk access.
 * These tests pin down the boundary behavior: anything that could escape a
 * client's directory must return null.
 *
 * PORTAL_ASSETS_BASE is set per-test to a freshly created temp tree so
 * realpath resolution is deterministic and symlink tests can add and remove
 * symlinks without stepping on production data.
 */

let tmpBase: string;
const CLIENT = 'arinya';
const FOREIGN = 'gr8progress';

beforeAll(() => {
  tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-assets-'));
  fs.mkdirSync(path.join(tmpBase, CLIENT, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(tmpBase, CLIENT, 'analysis', 'report.md'), '# ok');
  fs.mkdirSync(path.join(tmpBase, FOREIGN, 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(tmpBase, FOREIGN, 'analysis', 'secret.md'), '# secret');
  process.env.PORTAL_ASSETS_BASE = tmpBase;
  // Keep the symlink check ON so escape-via-symlink attempts are tested.
  delete process.env.PORTAL_DEV_MODE;
});

afterAll(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

describe('resolveDeliverablePath', () => {
  it('resolves a simple relative path inside the client directory', () => {
    const resolved = resolveDeliverablePath(CLIENT, 'analysis/report.md');
    expect(resolved).toBe(path.join(tmpBase, CLIENT, 'analysis', 'report.md'));
  });

  it('returns the client base when given an empty file path', () => {
    const resolved = resolveDeliverablePath(CLIENT, '');
    expect(resolved).toBe(path.join(tmpBase, CLIENT));
  });

  it('rejects parent-directory traversal (../)', () => {
    expect(resolveDeliverablePath(CLIENT, `../${FOREIGN}/analysis/secret.md`)).toBeNull();
  });

  it('rejects deep parent-directory traversal (../../)', () => {
    expect(resolveDeliverablePath(CLIENT, '../../../../etc/passwd')).toBeNull();
  });

  it('rejects absolute paths', () => {
    expect(resolveDeliverablePath(CLIENT, '/etc/passwd')).toBeNull();
  });

  it('rejects when a symlink in the client directory points to another client', () => {
    const linkPath = path.join(tmpBase, CLIENT, 'escape.md');
    fs.symlinkSync(path.join(tmpBase, FOREIGN, 'analysis', 'secret.md'), linkPath);
    try {
      expect(resolveDeliverablePath(CLIENT, 'escape.md')).toBeNull();
    } finally {
      fs.unlinkSync(linkPath);
    }
  });

  it('rejects when a symlink in the client directory points outside the assets base', () => {
    const linkPath = path.join(tmpBase, CLIENT, 'escape-root.md');
    fs.symlinkSync('/etc/passwd', linkPath);
    try {
      expect(resolveDeliverablePath(CLIENT, 'escape-root.md')).toBeNull();
    } finally {
      fs.unlinkSync(linkPath);
    }
  });

  it('allows access to files that do not yet exist (resolve-only check)', () => {
    const resolved = resolveDeliverablePath(CLIENT, 'analysis/not-yet.md');
    expect(resolved).toBe(path.join(tmpBase, CLIENT, 'analysis', 'not-yet.md'));
  });
});

// Misc helpers. Kept dependency-free so any module can pull these in.

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

// Repo root resolved from this file's location. Stable regardless of cwd.
//   cli/src/util.ts → cli/src → cli → <repo root>
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DOCKER_DIR = resolve(REPO_ROOT, 'docker');
export const SCRIPTS_DIR = resolve(REPO_ROOT, 'scripts');
export const CONTROLLER_ENV = resolve(REPO_ROOT, 'controller', '.env');
export const STATE_DIR = resolve(REPO_ROOT, 'state');

export function expandHome(p: string): string {
  if (p.startsWith('~/')) return resolve(homedir(), p.slice(2));
  if (p === '~') return homedir();
  return p;
}

export function have(bin: string): boolean {
  // Plain POSIX `which`. Good enough for the operator CLI; we don't ship
  // anywhere `which` isn't available (macOS, Linux, WSL).
  return spawnSync('which', [bin], { stdio: 'ignore' }).status === 0;
}

// Parse a .env file into { KEY: VALUE }. Comments and blank lines skipped.
// Values with surrounding quotes (single or double) are unwrapped.
export function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2] ?? '';
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1] as string] = v;
  }
  return out;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatRelative(date: Date | number | string): string {
  const t = typeof date === 'number' ? date : new Date(date).getTime();
  const delta = Date.now() - t;
  if (Number.isNaN(delta)) return '?';
  if (delta < 0) return 'in the future';
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

// Resolve a fetch failure into a short, human-readable reason. fetch() rejects
// with an AggregateError-ish shape on connection refused; pull out just the
// readable bit so doctor reports don't have stack traces in them.
export function fetchErrorReason(e: unknown): string {
  if (!e) return 'unknown';
  if (e instanceof Error) {
    const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code) return cause.code;
    if (cause?.message) return cause.message;
    return e.message;
  }
  return String(e);
}

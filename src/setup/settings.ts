import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
const BACKUP_PATH = join(CLAUDE_DIR, 'settings.backup.json');
const SOUNDS_DIR = join(CLAUDE_DIR, 'sounds');

export function getSettingsPath(): string {
  return SETTINGS_PATH;
}

export function getSoundsDir(): string {
  return SOUNDS_DIR;
}

export function readSettings(): Record<string, unknown> {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  const raw = readFileSync(SETTINGS_PATH, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

export function backupSettings(): string | null {
  if (!existsSync(SETTINGS_PATH)) {
    return null;
  }
  copyFileSync(SETTINGS_PATH, BACKUP_PATH);
  return BACKUP_PATH;
}

export function writeSettings(settings: Record<string, unknown>): void {
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export function ensureSoundsDir(): void {
  if (!existsSync(SOUNDS_DIR)) {
    mkdirSync(SOUNDS_DIR, { recursive: true });
  }
}

export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];

    if (
      isPlainObject(targetVal) &&
      isPlainObject(sourceVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

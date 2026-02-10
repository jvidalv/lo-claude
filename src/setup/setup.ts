import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, copyFileSync, existsSync } from 'node:fs';
import { getVerbs, getVerbPackDescription } from './verbs.js';
import { getSoundHooks, getSoundPackDescription, type SoundPack } from './sounds.js';
import { getPermissions, getPresetDescription, type PermissionPreset } from './permissions.js';
import {
  readSettings,
  backupSettings,
  writeSettings,
  ensureSoundsDir,
  getSoundsDir,
  deepMerge,
} from './settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve to src/setup even when running from dist
const PROJECT_ROOT = resolve(__dirname.replace('/dist/', '/src/').replace('/src/setup', ''));
const SOUNDS_SOURCE = resolve(PROJECT_ROOT, 'sounds', 'osrs');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function print(msg: string = ''): void {
  console.log(msg);
}

function banner(): void {
  print();
  print('  ╔══════════════════════════════════════╗');
  print('  ║        Lo-Claude Setup Wizard        ║');
  print('  ║   Configure your Claude Code vibes   ║');
  print('  ╚══════════════════════════════════════╝');
  print();
}

async function selectVerbs(): Promise<{ mode: string; verbs: string[] } | null> {
  print('── Spinner Verbs ──');
  print('Custom loading messages shown while Claude is thinking.');
  print();
  print('  1) berrus  — ' + getVerbPackDescription('berrus'));
  print('  2) random  — ' + getVerbPackDescription('random'));
  print('  3) custom  — Enter your own verbs');
  print('  4) skip    — Keep current settings');
  print();

  const choice = await ask('  Choose [1-4]: ');

  switch (choice) {
    case '1':
      return { mode: 'replace', verbs: getVerbs('berrus') };
    case '2':
      return { mode: 'replace', verbs: getVerbs('random') };
    case '3': {
      print();
      const input = await ask('  Enter verbs (comma-separated):\n  > ');
      const verbs = input
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      if (verbs.length === 0) {
        print('  No verbs entered, skipping.');
        return null;
      }
      return { mode: 'replace', verbs };
    }
    case '4':
    default:
      return null;
  }
}

async function selectSounds(): Promise<SoundPack> {
  print();
  print('── Sound Pack ──');
  print('Audio feedback for Claude Code events (task complete, errors, etc.)');
  print();
  print('  1) osrs — ' + getSoundPackDescription('osrs'));
  print('  2) none — ' + getSoundPackDescription('none'));
  print();

  const choice = await ask('  Choose [1-2]: ');

  switch (choice) {
    case '2':
      return 'none';
    case '1':
    default:
      return 'osrs';
  }
}

async function selectPermissions(): Promise<PermissionPreset | 'skip'> {
  print();
  print('── Permissions ──');
  print('Pre-approve common CLI commands so Claude can run them without asking.');
  print();
  print('  1) recommended — ' + getPresetDescription('recommended'));
  print('  2) minimal     — ' + getPresetDescription('minimal'));
  print('  3) skip        — Don\'t touch permissions');
  print();

  const choice = await ask('  Choose [1-3]: ');

  switch (choice) {
    case '1':
      return 'recommended';
    case '2':
      return 'minimal';
    case '3':
    default:
      return 'skip';
  }
}

function copySoundFiles(): number {
  if (!existsSync(SOUNDS_SOURCE)) {
    print(`  Warning: Sound files not found at ${SOUNDS_SOURCE}`);
    return 0;
  }

  ensureSoundsDir();
  const soundsDir = getSoundsDir();
  const files = readdirSync(SOUNDS_SOURCE);
  let copied = 0;

  for (const file of files) {
    if (file.endsWith('.ogg') || file.endsWith('.wav')) {
      copyFileSync(resolve(SOUNDS_SOURCE, file), resolve(soundsDir, file));
      copied++;
    }
  }

  return copied;
}

async function main(): Promise<void> {
  banner();

  // Step 1: Spinner Verbs
  const verbsConfig = await selectVerbs();

  // Step 2: Sound Pack
  const soundPack = await selectSounds();

  // Step 3: Permissions
  const permPreset = await selectPermissions();

  // Confirm
  print();
  print('── Summary ──');
  print(`  Verbs:       ${verbsConfig ? `${verbsConfig.verbs.length} custom verbs` : 'unchanged'}`);
  print(`  Sounds:      ${soundPack}`);
  print(`  Permissions: ${permPreset}`);
  print();

  const confirm = await ask('  Apply these settings? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    print('  Aborted.');
    rl.close();
    return;
  }

  // Apply
  print();
  print('── Applying ──');

  // Backup existing settings
  const backupPath = backupSettings();
  if (backupPath) {
    print(`  Backed up settings to ${backupPath}`);
  }

  // Read current settings
  let settings = readSettings();
  const changes: Record<string, unknown> = {};

  // Apply verbs
  if (verbsConfig) {
    changes['spinnerVerbs'] = verbsConfig;
    print(`  Set ${verbsConfig.verbs.length} spinner verbs`);
  }

  // Apply sounds
  if (soundPack !== 'none') {
    const copied = copySoundFiles();
    print(`  Copied ${copied} sound files to ${getSoundsDir()}`);

    const hooks = getSoundHooks(soundPack, '~/.claude/sounds');
    if (hooks) {
      changes['hooks'] = hooks;
      print(`  Configured ${Object.keys(hooks).length} sound hooks`);
    }
  }

  // Merge changes into settings
  if (Object.keys(changes).length > 0) {
    settings = deepMerge(settings, changes);
    writeSettings(settings);
    print('  Wrote settings to ~/.claude/settings.json');
  }

  // Apply permissions (these go to a separate local settings file or the same one)
  if (permPreset !== 'skip') {
    const perms = getPermissions(permPreset);
    const existing = (settings['permissions'] as Record<string, unknown>) ?? {};
    const existingAllow = (existing['allow'] as string[]) ?? [];
    const merged = [...new Set([...existingAllow, ...perms])];
    settings['permissions'] = { ...existing, allow: merged };
    writeSettings(settings);
    print(`  Added ${perms.length} permission rules`);
  }

  // Done
  print();
  print('  Done! Restart Claude Code to apply changes.');
  print();

  rl.close();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});

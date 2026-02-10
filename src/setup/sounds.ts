import { platform } from 'node:os';

export type SoundPack = 'osrs' | 'none';
export type OSType = 'macos' | 'linux' | 'windows';

interface HookEntry {
  hooks: Array<{
    type: 'command';
    command: string;
    async: true;
  }>;
}

type HooksConfig = Record<string, HookEntry[]>;

export function detectOS(): OSType {
  const p = platform();
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows';
  return 'linux';
}

export function getOSLabel(os: OSType): string {
  switch (os) {
    case 'macos':
      return 'macOS (afplay)';
    case 'linux':
      return 'Linux (paplay)';
    case 'windows':
      return 'Windows/WSL (powershell)';
  }
}

function buildHookCommand(soundsDir: string, files: string[], os: OSType): string {
  const paths = files.map((f) => `$S/${f}`).join(' ');
  const randomPick = `\${sounds[$((RANDOM % \${#sounds[@]}))]}`;
  const selectSound = `S=${soundsDir}; sounds=(${paths})`;

  switch (os) {
    case 'macos':
      return `${selectSound}; nohup afplay ${randomPick} &>/dev/null & disown`;
    case 'linux':
      return `${selectSound}; nohup paplay ${randomPick} &>/dev/null & disown`;
    case 'windows':
      return `${selectSound}; powershell.exe -c "(New-Object Media.SoundPlayer ${randomPick}).PlaySync()" &>/dev/null & disown`;
  }
}

function makeHook(soundsDir: string, files: string[], os: OSType): HookEntry {
  return {
    hooks: [
      {
        type: 'command',
        command: buildHookCommand(soundsDir, files, os),
        async: true,
      },
    ],
  };
}

const osrsSoundMap: Record<string, string[]> = {
  Stop: [
    'level_up.ogg',
    'level_up_fireworks.ogg',
    'coins.wav',
    'coins_jingle.wav',
    'unique_drop.ogg',
    'found_gem.wav',
    'mining.wav',
    'magic_tree.ogg',
    'fishing_cast.wav',
    'whip_attack.wav',
    'crossbow_attack.wav',
    'fire_strike.ogg',
    'eat_chomp.wav',
    'iron_door.wav',
  ],
  PostToolUseFailure: [
    'wrong.wav',
    'spell_failure.wav',
    'ghost_death.wav',
    'zombie_death.ogg',
    'locked.wav',
    'tele_block.ogg',
  ],
  Notification: [
    'protect_melee.ogg',
    'protect_missiles.ogg',
    'protect_magic.ogg',
    'prayer_recharge.wav',
    'piety.ogg',
    'smite.ogg',
  ],
  SubagentStop: [
    'teleport.ogg',
    'teleport_ancient.ogg',
    'fairy_rings.ogg',
    'home_teleport.ogg',
    'ice_barrage.ogg',
    'ice_blitz.ogg',
  ],
  SessionStart: [
    'level_up.ogg',
    'teleport.ogg',
    'home_teleport.ogg',
    'iron_door.wav',
    'coins_jingle.wav',
  ],
  SessionEnd: [
    'ghost_death.wav',
    'zombie_death.ogg',
    'vengeance.ogg',
    'godsword_special.wav',
    'dragon_claws_special.ogg',
    'dragonfire.ogg',
  ],
};

export function getSoundHooks(pack: SoundPack, soundsDir: string, os: OSType): HooksConfig | null {
  if (pack === 'none') return null;

  const hooks: HooksConfig = {};
  for (const [event, files] of Object.entries(osrsSoundMap)) {
    hooks[event] = [makeHook(soundsDir, files, os)];
  }
  return hooks;
}

export function getSoundPackDescription(pack: SoundPack): string {
  switch (pack) {
    case 'osrs':
      return 'Old School RuneScape sounds (level ups, combat, teleports, prayers)';
    case 'none':
      return 'No sounds';
  }
}

export function getSoundFiles(): string[] {
  return [...new Set(Object.values(osrsSoundMap).flat())];
}

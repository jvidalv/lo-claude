import { platform } from 'node:os';

export type SoundPack = 'osrs' | 'none';

interface HookEntry {
  hooks: Array<{
    type: 'command';
    command: string;
    async: true;
  }>;
}

type HooksConfig = Record<string, HookEntry[]>;

function getPlayCommand(): string {
  return platform() === 'darwin' ? 'afplay' : 'paplay';
}

function buildHookCommand(soundsDir: string, files: string[]): string {
  const play = getPlayCommand();
  const paths = files.map((f) => `$S/${f}`).join(' ');
  return `S=${soundsDir}; sounds=(${paths}); ${play} \${sounds[$((RANDOM % \${#sounds[@]}))]} &`;
}

function makeHook(soundsDir: string, files: string[]): HookEntry {
  return {
    hooks: [
      {
        type: 'command',
        command: buildHookCommand(soundsDir, files),
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

export function getSoundHooks(pack: SoundPack, soundsDir: string): HooksConfig | null {
  if (pack === 'none') return null;

  const hooks: HooksConfig = {};
  for (const [event, files] of Object.entries(osrsSoundMap)) {
    hooks[event] = [makeHook(soundsDir, files)];
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

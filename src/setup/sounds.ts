import { platform } from 'node:os';

export type SoundPackId = 'cstrike' | 'osrs' | 'csgo' | 'hl2' | 'hl1' | 'portal2' | 'tf2' | 'l4d2' | 'stardew';
export type OSType = 'macos' | 'linux' | 'windows';

interface HookEntry {
  hooks: Array<{
    type: 'command';
    command: string;
    async: true;
  }>;
}

type HooksConfig = Record<string, HookEntry[]>;

export interface SoundPackMeta {
  id: SoundPackId;
  game: string;
  sounds: Record<string, string>;
}

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

function buildHookCommand(soundsDir: string, file: string, os: OSType): string {
  const path = `$S/${file}`;
  const setDir = `S=${soundsDir}`;

  switch (os) {
    case 'macos':
      return `${setDir}; afplay ${path} >/dev/null 2>&1 &`;
    case 'linux':
      return `${setDir}; paplay ${path} >/dev/null 2>&1 &`;
    case 'windows':
      return `${setDir}; powershell.exe -c "(New-Object Media.SoundPlayer ${path}).PlaySync()" >/dev/null 2>&1 &`;
  }
}

function makeHook(soundsDir: string, file: string, os: OSType): HookEntry {
  return {
    hooks: [
      {
        type: 'command',
        command: buildHookCommand(soundsDir, file, os),
        async: true,
      },
    ],
  };
}

export const soundPacks: SoundPackMeta[] = [
  {
    id: 'cstrike',
    game: 'Counter-Strike 1.6',
    sounds: {
      SessionStart: 'radio-letsgo.wav',
      SessionEnd: 'radio-ctwin.wav',
      PostToolUseFailure: 'bot-thats_not_good.wav',
      PermissionRequest: 'weapons-c4_beep1.wav',
      Notification: 'ui-hint.wav',
      Stop: 'bot-enemy_down.wav',
      TaskCompleted: 'bot-and_thats_how_its_done.wav',
      PreCompact: 'weapons-c4_plant.wav',
    },
  },
  {
    id: 'osrs',
    game: 'Old School RuneScape',
    sounds: {
      SessionStart: 'teleport.ogg',
      SessionEnd: 'ghost-death.wav',
      PostToolUseFailure: 'spell-failure.wav',
      PermissionRequest: 'locked.wav',
      Notification: 'found-gem.wav',
      Stop: 'coins.wav',
      TaskCompleted: 'coins-jingle.wav',
      PreCompact: 'liquify.wav',
    },
  },
  {
    id: 'csgo',
    game: 'Counter-Strike: GO',
    sounds: {
      SessionStart: 'ui-mainmenu_press_play.wav',
      SessionEnd: 'ui-mainmenu_press_quit_02.wav',
      PostToolUseFailure: 'ui-lobby_error_01.wav',
      PermissionRequest: 'ui-competitive_accept_beep.wav',
      Notification: 'ui-lobby_notification_chat.wav',
      Stop: 'ui-inventory_item_close_01.wav',
      TaskCompleted: 'ui-xp_levelup.wav',
      PreCompact: 'ambient-hydraulic_1.wav',
    },
  },
  {
    id: 'hl2',
    game: 'Half-Life 2',
    sounds: {
      SessionStart: 'items-suitchargeok1.wav',
      SessionEnd: 'fvox-hev_shutdown.wav',
      PostToolUseFailure: 'fvox-hev_general_fail.wav',
      PermissionRequest: 'fvox-bell.wav',
      Notification: 'fvox-blip.wav',
      Stop: 'fvox-beep.wav',
      TaskCompleted: 'items-battery_pickup.wav',
      PreCompact: 'ambient-spinup.wav',
    },
  },
  {
    id: 'hl1',
    game: 'Half-Life',
    sounds: {
      SessionStart: 'fvox-hev_logon.wav',
      SessionEnd: 'fvox-hev_shutdown.wav',
      PostToolUseFailure: 'fvox-hev_general_fail.wav',
      PermissionRequest: 'fvox-bell.wav',
      Notification: 'fvox-blip.wav',
      Stop: 'fvox-boop.wav',
      TaskCompleted: 'items-smallmedkit1.wav',
      PreCompact: 'ambience-port_suckout1.wav',
    },
  },
  {
    id: 'portal2',
    game: 'Portal 2',
    sounds: {
      SessionStart: 'weapons-portalgun_powerup1.wav',
      SessionEnd: 'vfx-fizzler_shutdown_01.wav',
      PostToolUseFailure: 'ui-p2_editor_error.wav',
      PermissionRequest: 'ui-beep22.wav',
      Notification: 'ui-coop_hud_activate_01.wav',
      Stop: 'buttons-synth_positive_01.wav',
      TaskCompleted: 'buttons-test_chamber_pos_01.wav',
      PreCompact: 'world-tube_suction_object_01.wav',
    },
  },
  {
    id: 'tf2',
    game: 'Team Fortress 2',
    sounds: {
      SessionStart: 'vo-engineer_mvm_wave_start01.mp3',
      SessionEnd: 'vo-engineer_goodjob01.mp3',
      PostToolUseFailure: 'vo-engineer_negativevocalization01.mp3',
      PermissionRequest: 'ui-hint.wav',
      Notification: 'ui-message_update.wav',
      Stop: 'ui-buttonclick.wav',
      TaskCompleted: 'player-recharged.wav',
      PreCompact: 'player-spy_cloak.wav',
    },
  },
  {
    id: 'l4d2',
    game: 'Left 4 Dead 2',
    sounds: {
      SessionStart: 'ui-bigreward.wav',
      SessionEnd: 'doors-door_checkpoint_close1.wav',
      PostToolUseFailure: 'ui-beep_error01.wav',
      PermissionRequest: 'ui-beep_synthtone01.wav',
      Notification: 'ui-beep07.wav',
      Stop: 'ui-beepclear.wav',
      TaskCompleted: 'ui-littlereward.wav',
      PreCompact: 'ambient-hydraulic_1.wav',
    },
  },
  {
    id: 'stardew',
    game: 'Stardew Valley',
    sounds: {
      SessionStart: 'bigSelect.wav',
      SessionEnd: 'bigDeSelect.wav',
      PostToolUseFailure: 'cancel.wav',
      PermissionRequest: 'jingle1.wav',
      Notification: 'dwop.wav',
      Stop: 'money.wav',
      TaskCompleted: 'reward.wav',
      PreCompact: 'newRecipe.wav',
    },
  },
];

export function getSoundPack(id: SoundPackId): SoundPackMeta {
  const pack = soundPacks.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown sound pack: ${id}`);
  return pack;
}

export function getSoundHooks(packId: SoundPackId, soundsDir: string, os: OSType): HooksConfig {
  const pack = getSoundPack(packId);
  const hooks: HooksConfig = {};

  for (const [event, file] of Object.entries(pack.sounds)) {
    hooks[event] = [makeHook(soundsDir, file, os)];
  }

  return hooks;
}

export function getSoundFiles(packId: SoundPackId): string[] {
  const pack = getSoundPack(packId);
  return Object.values(pack.sounds);
}

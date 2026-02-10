export type PermissionPreset = 'recommended' | 'minimal';

interface PermissionConfig {
  allow: string[];
}

const recommendedPermissions: PermissionConfig = {
  allow: [
    'Bash(git *)',
    'Bash(npm *)',
    'Bash(npx *)',
    'Bash(yarn *)',
    'Bash(pnpm *)',
    'Bash(node *)',
    'Bash(tsx *)',
    'Bash(python *)',
    'Bash(python3 *)',
    'Bash(docker *)',
    'Bash(make *)',
    'Bash(cargo *)',
    'Bash(go *)',
    'Bash(afplay *)',
    'Bash(paplay *)',
    'Bash(aplay *)',
    'Bash(echo *)',
    'Bash(cat *)',
    'Bash(ls *)',
    'Bash(mkdir *)',
    'Bash(cp *)',
    'Bash(mv *)',
    'Bash(rm *.log)',
    'Bash(which *)',
    'Bash(env)',
  ],
};

const minimalPermissions: PermissionConfig = {
  allow: [
    'Bash(afplay *)',
    'Bash(paplay *)',
    'Bash(aplay *)',
  ],
};

const permissionPresets: Record<PermissionPreset, PermissionConfig> = {
  recommended: recommendedPermissions,
  minimal: minimalPermissions,
};

export function getPermissions(preset: PermissionPreset): string[] {
  return permissionPresets[preset].allow;
}

export function getPresetDescription(preset: PermissionPreset): string {
  switch (preset) {
    case 'recommended':
      return 'Common dev tools: git, npm, yarn, node, docker, python, etc.';
    case 'minimal':
      return 'Sound playback only (afplay/paplay/aplay)';
  }
}

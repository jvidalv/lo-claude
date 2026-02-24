import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LoClaudeConfig, Module } from '#core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Project root directory */
export const PROJECT_ROOT = resolve(__dirname, '../..');

/** Default config file path */
const CONFIG_PATH = resolve(PROJECT_ROOT, 'lo-claude.config.json');

/** Default configuration */
const DEFAULT_CONFIG: LoClaudeConfig = {
  enabledModules: [],
};

/**
 * Load configuration from lo-claude.config.json
 */
export function loadConfig(): LoClaudeConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Config file not found: ${CONFIG_PATH}`);
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content) as LoClaudeConfig;
    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  } catch (error) {
    console.error(`Failed to load config: ${String(error)}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Registry of available modules
 */
const moduleRegistry = new Map<string, () => Promise<Module>>();

/**
 * Register a module loader
 */
export function registerModule(name: string, loader: () => Promise<Module>): void {
  moduleRegistry.set(name, loader);
}

/**
 * Load all enabled modules
 */
export async function loadEnabledModules(config: LoClaudeConfig): Promise<Module[]> {
  const modules: Module[] = [];

  for (const moduleName of config.enabledModules) {
    const loader = moduleRegistry.get(moduleName);
    if (loader === undefined) {
      console.error(`Module not found in registry: ${moduleName}`);
      continue;
    }

    try {
      const module = await loader();
      modules.push(module);
      console.error(`Loaded module: ${moduleName}`);
    } catch (error) {
      console.error(`Failed to load module ${moduleName}: ${String(error)}`);
    }
  }

  return modules;
}

/**
 * Get all required OAuth scopes from enabled modules
 */
export function getRequiredScopes(modules: Module[]): string[] {
  const scopes = new Set<string>();
  for (const module of modules) {
    for (const scope of module.requiredScopes) {
      scopes.add(scope);
    }
  }
  return Array.from(scopes);
}

// Register built-in modules
registerModule('gmail', async () => {
  const { gmailModule } = await import('#modules/google/gmail/index.js');
  return gmailModule;
});

registerModule('mediavida', async () => {
  const { mediavidaModule } = await import('#modules/mediavida/index.js');
  return mediavidaModule;
});

registerModule('drive', async () => {
  const { driveModule } = await import('#modules/google/drive/index.js');
  return driveModule;
});

registerModule('s3', async () => {
  const { s3Module } = await import('#modules/aws/s3/index.js');
  return s3Module;
});

registerModule('forocoches', async () => {
  const { forocochesModule } = await import('#modules/forocoches/index.js');
  return forocochesModule;
});

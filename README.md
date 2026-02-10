# Lo-Claude

A modular Claude Code extension platform. Give Claude superpowers through pluggable modules and personalize your coding experience with custom sounds, spinner verbs, and permissions.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jvidalv/lo-claude.git
cd lo-claude

# Install dependencies
npm install

# Run the setup wizard
npm run setup
```

The setup wizard configures:
- **Spinner verbs** — Custom loading messages while Claude thinks
- **Sound effects** — OSRS-themed audio feedback for events
- **Permissions** — Pre-approve common CLI commands

## Modules

Lo-Claude is built around independent, pluggable modules. Enable only what you need.

| Module | Description | Tools |
|--------|-------------|-------|
| **Gmail** | Read and search emails | `gmail_list`, `gmail_read`, `gmail_search` |
| **Google Drive** | Manage files, organize receipts | `drive_list`, `drive_download`, `drive_rename`, `drive_move` |
| **AWS S3** | Manage S3 objects | `s3_list`, `s3_download`, `s3_upload`, `s3_rename`, `s3_move` |
| **Mediavida** | Read Spanish forum threads | `mediavida_thread`, `mediavida_page` |
| **Setup** | Configure Claude Code settings | Interactive CLI wizard |

## Adding to Claude Code

Add the MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "lo-claude": {
      "command": "npx",
      "args": ["tsx", "/path/to/lo-claude/src/core/mcp-server.ts"],
      "cwd": "/path/to/lo-claude"
    }
  }
}
```

Or for production (after `npm run build`):

```json
{
  "mcpServers": {
    "lo-claude": {
      "command": "node",
      "args": ["/path/to/lo-claude/dist/core/mcp-server.js"]
    }
  }
}
```

## Module Setup

Each module has a setup command you can run from Claude Code:

- `/gmail-setup` — Configure Gmail OAuth credentials
- `/drive-setup` — Configure Google Drive access
- `/s3-setup` — Configure AWS S3 access
- `/mediavida-setup` — Configure Mediavida forum cookies

## Creating Your Own Module

1. Create a directory at `src/modules/<name>/`
2. Implement the module interface:

```typescript
// src/modules/<name>/index.ts
import type { Module } from '#core/types.js';

export const myModule: Module = {
  name: 'my-module',
  tools: [/* MCP tool definitions */],
  requiredScopes: [],
};
```

3. Add tool implementations in `client.ts` and `tools.ts`
4. Register the module in `src/core/config.ts`
5. Add a setup command in `.claude/commands/<name>-setup.md`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `S3_BUCKET` | AWS S3 bucket name | `my-bucket` |
| `AWS_REGION` | AWS region | `eu-west-1` |

## Project Structure

```
lo-claude/
├── src/
│   ├── core/           # MCP server, config, types
│   ├── modules/        # Pluggable integrations
│   │   ├── google/     # Gmail + Drive (shared auth)
│   │   ├── aws/s3/     # AWS S3
│   │   └── mediavida/  # Forum scraper
│   └── setup/          # Interactive setup wizard
├── sounds/
│   └── osrs/           # OSRS sound pack (41 files)
├── .claude/
│   ├── commands/       # Slash commands
│   └── skills/         # Contextual knowledge
└── package.json
```

## Security

- Credentials and tokens are gitignored and stored locally only
- Each module requests only the OAuth scopes it needs
- Never commit `credentials.json`, `token.json`, or `cookies.txt`
- The setup wizard backs up your settings before making changes

## License

MIT

<p align="center">
  <img src="assets/header.jpg" alt="Lo Claude" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gmail-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail" />
  <img src="https://img.shields.io/badge/Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
  <img src="https://img.shields.io/badge/AWS%20S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white" alt="AWS S3" />
  <a href="#modules"><img src="https://www.mediavida.com/apple-touch-icon.png" alt="Mediavida" width="28" height="28" /></a>
  <a href="#modules"><img src="https://forocoches.com/foro/images/smilies/goofy.gif" alt="Forocoches" width="28" height="28" /></a>
</p>

## Quick Start

```bash
git clone https://github.com/jvidalv/lo-claude.git
cd lo-claude
npm install
npm run setup
```

The setup wizard configures custom **spinner verbs**, **sound effects** (OSRS, TF2, Stardew Valley...), and **permissions**.

## Modules

Enable only what you need. Each module is independent and pluggable.

| Module | Description | Tools |
|--------|-------------|-------|
| **Gmail** | Read and search emails | `gmail_list`, `gmail_read`, `gmail_search`, `gmail_invoices`, `gmail_download_invoices` |
| **Google Drive** | Manage files, organize receipts | `drive_list`, `drive_download`, `drive_rename`, `drive_move`, `drive_receipts`, `drive_organize_receipts` |
| **AWS S3** | Manage S3 objects, organize receipts | `s3_list`, `s3_download`, `s3_upload`, `s3_rename`, `s3_move`, `s3_receipts`, `s3_organize_receipts` |
| **Mediavida** | Read and summarize forum threads | `mediavida_thread`, `mediavida_page` |
| **Forocoches** | Read, post, and edit forum threads | `forocoches_thread`, `forocoches_page`, `forocoches_reply`, `forocoches_edit` |
| **Setup** | Configure Claude Code settings | Interactive CLI wizard (`npm run setup`) |

## Adding to Claude Code

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

Each module has a setup command: `/gmail-setup`, `/drive-setup`, `/s3-setup`, `/mediavida-setup`, `/forocoches-setup`.

## Creating Your Own Module

1. Create `src/modules/<name>/`
2. Add `client.ts` (logic) and `tools.ts` (MCP tool definitions)
3. Register in `src/core/config.ts`
4. Add `/commands/<name>-setup.md` and optionally `/skills/<name>/`

```typescript
import type { Module } from '#core/types.js';

export const myModule: Module = {
  name: 'my-module',
  tools: [/* MCP tool definitions */],
  requiredScopes: [],
};
```

## Project Structure

```
lo-claude/
├── src/
│   ├── core/              # MCP server, config, types
│   ├── modules/
│   │   ├── google/        # Gmail + Drive (shared OAuth)
│   │   ├── aws/           # S3
│   │   ├── mediavida/     # Forum reader
│   │   └── forocoches/    # Forum reader + poster
│   └── setup/             # Interactive setup wizard
├── sounds/                # Sound packs (OSRS, TF2, Stardew Valley...)
├── .claude/
│   ├── commands/          # Slash commands
│   └── skills/            # Contextual knowledge for Claude
└── package.json
```

## Security

- Credentials stored locally, never committed
- Each module requests only the OAuth scopes it needs
- Never commit `credentials.json`, `token.json`, or `cookies.txt`

## License

MIT

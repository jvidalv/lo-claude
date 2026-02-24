# Lo-Claude

## Available MCP Tools

You have access to these MCP tools. Use them directly when the user asks about emails or forum threads:

### Gmail Tools
- `gmail_list` - List emails. Args: `maxResults` (number), `query` (string), `labelIds` (array)
- `gmail_read` - Read full email by ID. Args: `messageId` (string, required)
- `gmail_search` - Search emails. Args: `query` (string, required), `maxResults` (number)

### Google Drive Tools
- `drive_list` - List files in a folder. Args: `folderId` (string), `folderPath` (string)
- `drive_download` - Download file to local .temp folder. Args: `fileId` (string, required)
- `drive_rename` - Rename a file. Args: `fileId` (string, required), `newName` (string, required)
- `drive_move` - Move file to another folder. Args: `fileId` (string, required), `targetFolderId` or `targetFolderPath`
- `drive_receipts` - List receipt photos from Receipts/Inbox with suggested names. Args: `folderPath` (string)
- `drive_organize_receipts` - Rename and move receipts to Organized folder. Args: `fileIds` (array, required), `names` (array, required)

### AWS S3 Tools
- `s3_list` - List objects in a bucket. Args: `bucket` (string), `prefix` (string), `maxKeys` (number)
- `s3_download` - Download object to local .temp folder. Args: `key` (string, required), `bucket` (string)
- `s3_upload` - Upload local file to S3. Args: `key` (string, required), `localPath` (string, required), `bucket` (string)
- `s3_rename` - Rename an object. Args: `sourceKey` (string, required), `destKey` (string, required), `bucket` (string)
- `s3_move` - Move object to different prefix. Args: `sourceKey` (string, required), `destPrefix` (string, required), `bucket` (string)
- `s3_receipts` - List receipt photos from S3 inbox with suggested names. Args: `bucket` (string), `prefix` (string)
- `s3_organize_receipts` - Rename and move receipts to organized prefix. Args: `keys` (array, required), `names` (array, required)

### Mediavida Tools
- `mediavida_thread` - Get and summarize a full thread. Args: `url` (string, required), `maxPages` (number)
- `mediavida_page` - Get a single page of a thread. Args: `url` (string, required), `page` (number)

### Forocoches Tools
- `forocoches_thread` - Get and summarize a full thread. Args: `url` (string, required), `maxPages` (number)
- `forocoches_page` - Get a single page of a thread. Args: `url` (string, required), `page` (number)
- `forocoches_reply` - Post a reply to a thread. Args: `url` (string, required), `message` (string, required)
- `forocoches_edit` - Edit an existing post. Args: `postId` (string, required), `message` (string, required), `reason` (string, optional)

**Examples:**
- "Show my emails" → use `gmail_list`
- "Find emails from John" → use `gmail_search` with query "from:john"
- "Show my receipt photos" → use `drive_receipts` or `s3_receipts`
- "List files in Receipts/Inbox" → use `drive_list` with folderPath
- "List files in S3" → use `s3_list` with prefix
- "Summarize this mediavida thread: [url]" → use `mediavida_thread`
- "Summarize this forocoches thread: [url]" → use `forocoches_thread`

## Commands vs Skills

### Commands (`.claude/commands/*.md`)
Commands are **user-invoked actions** triggered with `/command-name`. They execute a specific task or workflow.

**When to use commands:**
- Setup wizards (e.g., `/gmail-setup`, `/mediavida-setup`)
- Task automation (e.g., `/gmail-daily`, `/gmail-unread`)
- One-shot operations the user explicitly requests

**Structure:**
```
.claude/commands/
├── gmail-setup.md        # Setup Gmail OAuth
├── gmail-daily.md        # Show yesterday's emails
├── mediavida-setup.md    # Setup Mediavida cookies
└── init-lo-claude.md     # Initialize the project
```

### Skills (`.claude/skills/<module>/*.md`)
Skills are **contextual knowledge** that Claude uses automatically when relevant. They have YAML frontmatter with `name` and `description`.

**When to use skills:**
- Domain-specific knowledge (e.g., API patterns, formatting rules)
- Reference guides Claude should know when working on a topic
- Best practices for a specific module or technology

**Structure:**
```
.claude/skills/
└── mediavida/
    └── write-post.md     # Mediavida formatting reference
```

**Skill format:**
```markdown
---
name: skill-name
description: When to use this skill (used for auto-selection)
---

# Skill Content

Reference material, patterns, examples...
```

### Summary

| Aspect | Commands | Skills |
| ------ | -------- | ------ |
| Invocation | User types `/command` | Auto-selected by Claude |
| Purpose | Execute tasks | Provide knowledge |
| Location | `.claude/commands/` | `.claude/skills/<module>/` |
| Format | Plain markdown | YAML frontmatter + markdown |

## Project Objectives
- Give Claude superpowers to automate mundane tasks (Gmail, Drive, etc.)
- Enable users to interact with their services through Claude, not product UIs

## Core Principles
- **Open Source** - Public repo, MIT license
- **Modular** - Each integration is an independent, pluggable module
- **Zero-opinion** - No forced patterns, enable only what you need
- **Claude Code-native** - MCP tools, commands, skills (not CLI scripts for humans)
- **Strictly Typed** - TypeScript strict mode, no `any`, explicit types everywhere

## Technical Standards
- Node.js + TypeScript (strict mode)
- MCP SDK for tool integration
- Each module follows the Module interface
- Shared auth layer for Google services

## File Conventions
- `src/core/` - Core platform code
- `src/modules/<name>/` - Each module is self-contained
- `.claude/commands/` - Claude Code slash commands
- `.claude/skills/<module>/` - Module-specific skills
- Config in `lo-claude.config.json`

## When Adding New Modules
1. Create `src/modules/<name>/` directory
2. Implement Module interface (name, tools, scopes)
3. Register module in `src/core/config.ts`
4. Add setup command in `.claude/commands/<module>-setup.md`
5. Add skills in `.claude/skills/<module>/` if needed
6. Update this file with module tools

## Module Interface
Each module must export:
```typescript
interface Module {
  name: string;
  tools: MCPTool[];           // MCP tools this module provides
  requiredScopes: string[];   // OAuth scopes needed
  setup?: () => Promise<void>; // Optional setup logic
}
```

## Available Modules
- `gmail` - Read and search Gmail messages
- `drive` - Manage files in Google Drive, organize receipt photos
- `s3` - Manage files in AWS S3, organize receipt photos
- `mediavida` - Read and summarize Mediavida forum threads
- `forocoches` - Read and summarize Forocoches forum threads
- `setup` - Interactive CLI wizard to configure Claude Code settings (not an MCP module)

## Setup Module

The setup module (`src/setup/`) is an interactive CLI wizard that configures Claude Code's `~/.claude/settings.json`. It is NOT an MCP module — it runs as a standalone script via `npm run setup`.

### Files
- `src/setup/setup.ts` — Main entry point, interactive wizard
- `src/setup/verbs.ts` — Spinner verb pack definitions (berrus, random, custom)
- `src/setup/sounds.ts` — Sound hook configuration and OSRS sound mappings
- `src/setup/permissions.ts` — Permission preset definitions (recommended, minimal)
- `src/setup/settings.ts` — Settings file read/merge/write with backup
- `sounds/osrs/` — 41 OSRS sound files (.ogg, .wav) bundled in repo

### What it configures
- **Spinner verbs** — Custom loading messages (replaces defaults)
- **Sound hooks** — Audio feedback for Stop, Failure, Notification, SubagentStop, SessionStart, SessionEnd
- **Permissions** — Pre-approved CLI commands in settings.json

### Key behaviors
- Deep merges into existing settings (preserves user's other config)
- Backs up settings to `~/.claude/settings.backup.json` before writing
- Copies sound files from `sounds/osrs/` to `~/.claude/sounds/`
- Detects OS: uses `afplay` on macOS, `paplay` on Linux
- Idempotent — safe to run multiple times

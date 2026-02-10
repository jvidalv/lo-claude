# Lo-Claude Setup Wizard

Initialize Lo-Claude and configure modules.

## Instructions

1. **Install dependencies**
   Run `npm install` to install project dependencies.

2. **Ask which modules to enable**
   Ask the user which modules they want to enable. Currently available:
   - `gmail` - Read and search Gmail messages

3. **Update configuration**
   Update `lo-claude.config.json` with the enabled modules.

4. **Run module-specific setup**
   For each enabled module, run its setup command:
   - Gmail: Follow the steps in `/modules:gmail`

5. **Restart Claude Code**
   The MCP server is configured in `.claude/claude.json`. Restart Claude Code to load it.

6. **Verify**
   After restarting, run `/mcp` to confirm lo-claude is listed, then try "List my emails".

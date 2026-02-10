import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, loadEnabledModules } from '#core/config.js';
import type { MCPTool } from '#core/types.js';

/**
 * Create and start the MCP server
 */
async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();
  console.error('Lo-Claude MCP Server starting...');
  console.error(`Enabled modules: ${config.enabledModules.join(', ') || 'none'}`);

  // Load enabled modules
  const modules = await loadEnabledModules(config);

  // Collect all tools from all modules
  const allTools = new Map<string, MCPTool>();
  for (const module of modules) {
    for (const tool of module.tools) {
      if (allTools.has(tool.name)) {
        console.error(`Warning: Duplicate tool name "${tool.name}" from module "${module.name}"`);
      }
      allTools.set(tool.name, tool);
    }
  }

  console.error(`Registered ${allTools.size} tools`);

  // Create MCP server
  const server = new Server(
    {
      name: 'lo-claude',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(allTools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return { tools };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    const tool = allTools.get(name);
    if (tool === undefined) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(args ?? {});
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Tool "${name}" error: ${errorMessage}`);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error executing ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Lo-Claude MCP Server running');
}

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

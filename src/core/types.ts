import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Tool result - re-export from SDK
 */
export type MCPToolResult = CallToolResult;

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<MCPToolResult>;
}

/**
 * Module interface - all modules must implement this
 */
export interface Module {
  /** Unique module name */
  name: string;
  /** MCP tools this module provides */
  tools: MCPTool[];
  /** OAuth scopes required by this module */
  requiredScopes: string[];
  /** Optional setup logic */
  setup?: () => Promise<void>;
}

/**
 * Lo-Claude configuration file structure
 */
export interface LoClaudeConfig {
  enabledModules: string[];
}

/**
 * Google OAuth credentials file structure
 */
export interface GoogleCredentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/**
 * Google OAuth token file structure
 */
export interface GoogleToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * MCP Server type alias
 */
export type MCPServer = Server;

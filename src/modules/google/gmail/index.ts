import type { Module } from '#core/types.js';
import { gmailTools } from '#modules/google/gmail/tools.js';
import { GMAIL_SCOPES } from '#modules/google/gmail/client.js';

/**
 * Gmail Module
 *
 * Provides MCP tools for reading and searching Gmail messages.
 *
 * Tools:
 * - gmail_list: List emails with optional filtering
 * - gmail_read: Read a specific email by ID
 * - gmail_search: Search emails using Gmail query syntax
 */
export const gmailModule: Module = {
  name: 'gmail',
  tools: gmailTools,
  requiredScopes: GMAIL_SCOPES,
};

import type { Module } from '#core/types.js';
import { forocochesTools } from '#modules/forocoches/tools.js';

/**
 * Forocoches Module
 *
 * Provides MCP tools for reading Forocoches forum threads.
 *
 * Tools:
 * - forocoches_thread: Get and summarize a full thread
 * - forocoches_page: Get a single page of a thread
 */
export const forocochesModule: Module = {
  name: 'forocoches',
  tools: forocochesTools,
  requiredScopes: [], // No OAuth needed, uses cookies
};

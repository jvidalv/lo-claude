import type { Module } from '#core/types.js';
import { mediavidaTools } from '#modules/mediavida/tools.js';

/**
 * Mediavida Module
 *
 * Provides MCP tools for reading Mediavida forum threads.
 *
 * Tools:
 * - mediavida_thread: Get and summarize a full thread
 * - mediavida_page: Get a single page of a thread
 */
export const mediavidaModule: Module = {
  name: 'mediavida',
  tools: mediavidaTools,
  requiredScopes: [], // No OAuth needed, uses cookies
};

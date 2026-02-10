import type { Module } from '#core/types.js';
import { driveTools } from '#modules/google/drive/tools.js';
import { DRIVE_SCOPES } from '#modules/google/drive/client.js';

/**
 * Google Drive Module
 *
 * Provides MCP tools for managing files in Google Drive.
 *
 * Tools:
 * - drive_list: List files in a folder
 * - drive_download: Download file to local .temp folder
 * - drive_rename: Rename a file
 * - drive_move: Move file to another folder
 * - drive_receipts: List receipt photos from Receipts/Inbox
 * - drive_organize_receipts: Organize receipt photos (rename + move)
 */
export const driveModule: Module = {
  name: 'drive',
  tools: driveTools,
  requiredScopes: DRIVE_SCOPES,
};

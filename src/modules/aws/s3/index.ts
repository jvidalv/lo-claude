import type { Module } from '#core/types.js';
import { s3Tools } from '#modules/aws/s3/tools.js';

/**
 * AWS S3 Module
 *
 * Provides MCP tools for managing files in Amazon S3.
 * Uses AWS SDK default credential chain (env vars, ~/.aws/credentials, IAM role).
 *
 * Tools:
 * - s3_list: List objects in a bucket
 * - s3_download: Download object to local .temp folder
 * - s3_upload: Upload local file to S3
 * - s3_rename: Rename an object
 * - s3_move: Move object to different prefix
 * - s3_receipts: List receipt photos from inbox
 * - s3_organize_receipts: Organize receipt photos (rename + move)
 */
export const s3Module: Module = {
  name: 's3',
  tools: s3Tools,
  requiredScopes: [], // S3 uses AWS credentials, not OAuth scopes
};

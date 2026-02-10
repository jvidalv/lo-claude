import type { MCPTool, MCPToolResult } from '#core/types.js';
import {
  listObjects,
  downloadObjectToTemp,
  uploadFile,
  renameObject,
  moveObject,
  listReceiptPhotos,
  organizeReceipts,
  generateReceiptFilename,
  DEFAULT_BUCKET,
  DEFAULT_RECEIPTS_PREFIX,
  type S3Object,
} from '#modules/aws/s3/client.js';
import { basename } from 'node:path';

/**
 * Create a successful tool result with formatted text
 */
function textResult(text: string): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format object list for display
 */
function formatObjectList(objects: S3Object[], bucket: string, prefix?: string): string {
  if (objects.length === 0) {
    const location = prefix !== undefined ? `s3://${bucket}/${prefix}` : `s3://${bucket}`;
    return `No objects found in ${location}.`;
  }

  const lines: string[] = [];
  const location = prefix !== undefined ? `s3://${bucket}/${prefix}` : `s3://${bucket}`;
  lines.push(`Found ${objects.length} object${objects.length === 1 ? '' : 's'} in ${location}:`);
  lines.push('');

  for (const obj of objects) {
    const size = formatSize(obj.size);
    const date = formatDate(obj.lastModified);
    const name = basename(obj.key);

    lines.push(`  ${name}`);
    lines.push(`    ${date}  ${size.padStart(8)}  key: ${obj.key}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format receipt list for display (with suggested names)
 */
function formatReceiptList(objects: S3Object[], bucket: string, prefix: string): string {
  if (objects.length === 0) {
    return `No receipt photos found in s3://${bucket}/${prefix}.`;
  }

  const lines: string[] = [];
  lines.push(`Found ${objects.length} receipt photo${objects.length === 1 ? '' : 's'} in s3://${bucket}/${prefix}:`);
  lines.push('');

  for (const obj of objects) {
    const date = formatDate(obj.lastModified);
    const suggested = generateReceiptFilename(obj);
    const name = basename(obj.key);

    lines.push(`- ${name} (${date})`);
    lines.push(`  suggested: ${suggested}`);
    lines.push(`  key: ${obj.key}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * s3_list - List objects in a bucket
 */
const s3ListTool: MCPTool = {
  name: 's3_list',
  description:
    'List objects in an S3 bucket with optional prefix. Defaults to the josep-personal bucket.',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      prefix: {
        type: 'string',
        description: 'Optional prefix to filter objects (e.g., "receipts/inbox/")',
      },
      maxKeys: {
        type: 'number',
        description: 'Maximum number of objects to return (default: 100)',
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const prefix = typeof args['prefix'] === 'string' ? args['prefix'] : undefined;
    const maxKeys = typeof args['maxKeys'] === 'number' ? args['maxKeys'] : undefined;

    const objects = await listObjects(bucket, prefix, maxKeys);

    return textResult(formatObjectList(objects, bucket, prefix));
  },
};

/**
 * s3_download - Download an object to local temp folder
 */
const s3DownloadTool: MCPTool = {
  name: 's3_download',
  description:
    'Download an object from S3 to the local .temp folder. Returns the local file path.',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      key: {
        type: 'string',
        description: 'The S3 object key to download',
      },
    },
    required: ['key'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const key = args['key'];

    if (typeof key !== 'string' || key === '') {
      throw new Error('key is required');
    }

    const localPath = await downloadObjectToTemp(bucket, key);
    const name = basename(key);

    return textResult(`Downloaded "${name}" to:\n${localPath}`);
  },
};

/**
 * s3_upload - Upload a local file to S3
 */
const s3UploadTool: MCPTool = {
  name: 's3_upload',
  description: 'Upload a local file to S3.',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      key: {
        type: 'string',
        description: 'The S3 object key (destination path)',
      },
      localPath: {
        type: 'string',
        description: 'Local file path to upload',
      },
      contentType: {
        type: 'string',
        description: 'Content type (e.g., "image/jpeg"). Auto-detected if not provided.',
      },
    },
    required: ['key', 'localPath'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const key = args['key'];
    const localPath = args['localPath'];
    const contentType = typeof args['contentType'] === 'string' ? args['contentType'] : undefined;

    if (typeof key !== 'string' || key === '') {
      throw new Error('key is required');
    }
    if (typeof localPath !== 'string' || localPath === '') {
      throw new Error('localPath is required');
    }

    await uploadFile(bucket, key, localPath, contentType);

    return textResult(`Uploaded "${basename(localPath)}" to s3://${bucket}/${key}`);
  },
};

/**
 * s3_rename - Rename an object in S3
 */
const s3RenameTool: MCPTool = {
  name: 's3_rename',
  description: 'Rename an object in S3 (copy to new key, delete old).',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      sourceKey: {
        type: 'string',
        description: 'Current object key',
      },
      destKey: {
        type: 'string',
        description: 'New object key',
      },
    },
    required: ['sourceKey', 'destKey'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const sourceKey = args['sourceKey'];
    const destKey = args['destKey'];

    if (typeof sourceKey !== 'string' || sourceKey === '') {
      throw new Error('sourceKey is required');
    }
    if (typeof destKey !== 'string' || destKey === '') {
      throw new Error('destKey is required');
    }

    await renameObject(bucket, sourceKey, destKey);

    return textResult(`Renamed "${basename(sourceKey)}" to "${basename(destKey)}"`);
  },
};

/**
 * s3_move - Move an object to a different prefix
 */
const s3MoveTool: MCPTool = {
  name: 's3_move',
  description: 'Move an object to a different prefix/folder in S3.',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      sourceKey: {
        type: 'string',
        description: 'Current object key',
      },
      destPrefix: {
        type: 'string',
        description: 'Destination prefix (e.g., "receipts/organized/")',
      },
    },
    required: ['sourceKey', 'destPrefix'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const sourceKey = args['sourceKey'];
    const destPrefix = args['destPrefix'];

    if (typeof sourceKey !== 'string' || sourceKey === '') {
      throw new Error('sourceKey is required');
    }
    if (typeof destPrefix !== 'string' || destPrefix === '') {
      throw new Error('destPrefix is required');
    }

    const newKey = await moveObject(bucket, sourceKey, destPrefix);

    return textResult(`Moved "${basename(sourceKey)}" to ${newKey}`);
  },
};

/**
 * s3_receipts - List receipt photos from inbox
 */
const s3ReceiptsTool: MCPTool = {
  name: 's3_receipts',
  description:
    'List receipt photos from the S3 receipts inbox. Shows filename, date, and suggested name for each photo.',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      prefix: {
        type: 'string',
        description: `Receipts inbox prefix (default: "${DEFAULT_RECEIPTS_PREFIX}inbox/")`,
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const prefix = typeof args['prefix'] === 'string' ? args['prefix'] : `${DEFAULT_RECEIPTS_PREFIX}inbox/`;

    const objects = await listReceiptPhotos(bucket, prefix);

    return textResult(formatReceiptList(objects, bucket, prefix));
  },
};

/**
 * s3_organize_receipts - Organize receipt photos
 */
const s3OrganizeReceiptsTool: MCPTool = {
  name: 's3_organize_receipts',
  description:
    'Organize receipt photos by renaming them and moving to the organized folder. ' +
    'Provide arrays of S3 keys and corresponding new names (without extension - it will be preserved).',
  inputSchema: {
    type: 'object',
    properties: {
      bucket: {
        type: 'string',
        description: `S3 bucket name (default: "${DEFAULT_BUCKET}")`,
      },
      keys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of S3 object keys to organize',
      },
      names: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of new names for the files (without extension). Format: "restaurant-month-year" (e.g., "lateral-january-2025")',
      },
      organizedPrefix: {
        type: 'string',
        description: `Target prefix for organized receipts (default: "${DEFAULT_RECEIPTS_PREFIX}organized/")`,
      },
    },
    required: ['keys', 'names'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const bucket = typeof args['bucket'] === 'string' ? args['bucket'] : DEFAULT_BUCKET;
    const keys = args['keys'];
    const names = args['names'];
    const organizedPrefix = typeof args['organizedPrefix'] === 'string'
      ? args['organizedPrefix']
      : `${DEFAULT_RECEIPTS_PREFIX}organized/`;

    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error('keys must be a non-empty array');
    }
    if (!Array.isArray(names) || names.length === 0) {
      throw new Error('names must be a non-empty array');
    }
    if (keys.length !== names.length) {
      throw new Error('keys and names arrays must have the same length');
    }

    const results = await organizeReceipts(
      bucket,
      keys as string[],
      names as string[],
      organizedPrefix
    );

    const successCount = results.filter((r) => r.success).length;
    const lines: string[] = [
      `Organized ${successCount} of ${results.length} receipt${results.length === 1 ? '' : 's'} to s3://${bucket}/${organizedPrefix}`,
      '',
    ];

    for (const result of results) {
      if (result.success) {
        lines.push(`[OK] ${basename(result.key)} -> ${basename(result.newKey)}`);
      } else {
        lines.push(`[ERROR] ${basename(result.key)}: ${result.error ?? 'Unknown error'}`);
      }
    }

    return textResult(lines.join('\n'));
  },
};

/**
 * All S3 MCP tools
 */
export const s3Tools: MCPTool[] = [
  s3ListTool,
  s3DownloadTool,
  s3UploadTool,
  s3RenameTool,
  s3MoveTool,
  s3ReceiptsTool,
  s3OrganizeReceiptsTool,
];

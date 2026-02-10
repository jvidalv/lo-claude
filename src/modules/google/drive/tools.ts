import type { MCPTool, MCPToolResult } from '#core/types.js';
import {
  listFiles,
  listFilesByPath,
  findFolderByPath,
  downloadFileToTemp,
  renameFile,
  moveFile,
  createFolderPath,
  getFile,
  generateReceiptFilename,
  type DriveFile,
} from '#modules/google/drive/client.js';

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
function formatSize(bytes: string): string {
  const size = parseInt(bytes, 10);
  if (isNaN(size) || size === 0) return '-';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  if (dateStr === '') return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format file list for display
 */
function formatFileList(files: DriveFile[], folderPath?: string): string {
  if (files.length === 0) {
    return folderPath !== undefined
      ? `No files found in ${folderPath}.`
      : 'No files found.';
  }

  const lines: string[] = [];
  const header = folderPath !== undefined
    ? `Found ${files.length} file${files.length === 1 ? '' : 's'} in ${folderPath}:`
    : `Found ${files.length} file${files.length === 1 ? '' : 's'}:`;
  lines.push(header);
  lines.push('');

  for (const file of files) {
    const size = formatSize(file.size);
    const date = formatDate(file.createdTime || file.modifiedTime);
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const icon = isFolder ? '[DIR]' : '     ';

    lines.push(`${icon} ${file.name}`);
    lines.push(`      ${date}  ${size.padStart(8)}  id:${file.id}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format receipt list for display (with suggested names)
 */
function formatReceiptList(files: DriveFile[], folderPath: string): string {
  // Filter to only image files
  const imageFiles = files.filter((f) => {
    const mimeType = f.mimeType.toLowerCase();
    const name = f.name.toLowerCase();
    return (
      mimeType.startsWith('image/') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.heic')
    );
  });

  if (imageFiles.length === 0) {
    return `No receipt photos found in ${folderPath}.`;
  }

  const lines: string[] = [];
  lines.push(`Found ${imageFiles.length} receipt photo${imageFiles.length === 1 ? '' : 's'} in ${folderPath}:`);
  lines.push('');

  for (const file of imageFiles) {
    const date = formatDate(file.createdTime || file.modifiedTime);
    const suggested = generateReceiptFilename(file);

    lines.push(`- ${file.name} (${date})`);
    lines.push(`  suggested: ${suggested}`);
    lines.push(`  id: ${file.id}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * drive_list - List files in a folder
 */
const driveListTool: MCPTool = {
  name: 'drive_list',
  description:
    'List files in a Google Drive folder. Can specify folder by ID or path (e.g., "Receipts/Inbox").',
  inputSchema: {
    type: 'object',
    properties: {
      folderId: {
        type: 'string',
        description: 'The folder ID to list files from. Use "root" for the root folder.',
      },
      folderPath: {
        type: 'string',
        description: 'Path to the folder (e.g., "Receipts/Inbox"). Alternative to folderId.',
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const folderId = typeof args['folderId'] === 'string' ? args['folderId'] : undefined;
    const folderPath = typeof args['folderPath'] === 'string' ? args['folderPath'] : undefined;

    if (folderId === undefined && folderPath === undefined) {
      throw new Error('Either folderId or folderPath must be provided');
    }

    let files: DriveFile[];
    let displayPath: string | undefined;

    if (folderPath !== undefined) {
      files = await listFilesByPath(folderPath);
      displayPath = folderPath;
    } else {
      files = await listFiles(folderId!);
      displayPath = folderId === 'root' ? 'My Drive' : undefined;
    }

    return textResult(formatFileList(files, displayPath));
  },
};

/**
 * drive_download - Download a file to local temp folder
 */
const driveDownloadTool: MCPTool = {
  name: 'drive_download',
  description:
    'Download a file from Google Drive to the local .temp folder. Returns the local file path.',
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'The ID of the file to download',
      },
    },
    required: ['fileId'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const fileId = args['fileId'];

    if (typeof fileId !== 'string' || fileId === '') {
      throw new Error('fileId is required');
    }

    // Get file metadata for the filename
    const file = await getFile(fileId);
    const localPath = await downloadFileToTemp(fileId, file.name);

    return textResult(`Downloaded "${file.name}" to:\n${localPath}`);
  },
};

/**
 * drive_rename - Rename a file
 */
const driveRenameTool: MCPTool = {
  name: 'drive_rename',
  description: 'Rename a file in Google Drive.',
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'The ID of the file to rename',
      },
      newName: {
        type: 'string',
        description: 'The new name for the file (including extension)',
      },
    },
    required: ['fileId', 'newName'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const fileId = args['fileId'];
    const newName = args['newName'];

    if (typeof fileId !== 'string' || fileId === '') {
      throw new Error('fileId is required');
    }
    if (typeof newName !== 'string' || newName === '') {
      throw new Error('newName is required');
    }

    // Get current name for confirmation
    const file = await getFile(fileId);
    const oldName = file.name;

    await renameFile(fileId, newName);

    return textResult(`Renamed "${oldName}" to "${newName}"`);
  },
};

/**
 * drive_move - Move a file to another folder
 */
const driveMoveTool: MCPTool = {
  name: 'drive_move',
  description: 'Move a file to another folder in Google Drive.',
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'The ID of the file to move',
      },
      targetFolderId: {
        type: 'string',
        description: 'The ID of the target folder',
      },
      targetFolderPath: {
        type: 'string',
        description: 'Path to the target folder (e.g., "Receipts/Organized"). Alternative to targetFolderId.',
      },
    },
    required: ['fileId'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const fileId = args['fileId'];
    const targetFolderId = typeof args['targetFolderId'] === 'string' ? args['targetFolderId'] : undefined;
    const targetFolderPath = typeof args['targetFolderPath'] === 'string' ? args['targetFolderPath'] : undefined;

    if (typeof fileId !== 'string' || fileId === '') {
      throw new Error('fileId is required');
    }
    if (targetFolderId === undefined && targetFolderPath === undefined) {
      throw new Error('Either targetFolderId or targetFolderPath must be provided');
    }

    // Get file name for confirmation
    const file = await getFile(fileId);

    let folderId: string;
    let folderDisplay: string;

    if (targetFolderPath !== undefined) {
      // Find or create the folder path
      const existingId = await findFolderByPath(targetFolderPath);
      if (existingId !== undefined) {
        folderId = existingId;
      } else {
        // Create the folder path
        folderId = await createFolderPath(targetFolderPath);
      }
      folderDisplay = targetFolderPath;
    } else {
      folderId = targetFolderId!;
      folderDisplay = targetFolderId!;
    }

    await moveFile(fileId, folderId);

    return textResult(`Moved "${file.name}" to ${folderDisplay}`);
  },
};

/**
 * drive_receipts - List receipt photos from Receipts/Inbox
 */
const driveReceiptsTool: MCPTool = {
  name: 'drive_receipts',
  description:
    'List receipt photos from the Receipts/Inbox folder. Shows filename, date, and suggested name for each photo.',
  inputSchema: {
    type: 'object',
    properties: {
      folderPath: {
        type: 'string',
        description: 'Path to the receipts folder (default: "Receipts/Inbox")',
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const folderPath = typeof args['folderPath'] === 'string' ? args['folderPath'] : 'Receipts/Inbox';

    const files = await listFilesByPath(folderPath);

    return textResult(formatReceiptList(files, folderPath));
  },
};

/**
 * drive_organize_receipts - Organize receipt photos
 */
const driveOrganizeReceiptsTool: MCPTool = {
  name: 'drive_organize_receipts',
  description:
    'Organize receipt photos by renaming them and moving to Receipts/Organized folder. ' +
    'Provide arrays of file IDs and corresponding new names (without extension - it will be preserved).',
  inputSchema: {
    type: 'object',
    properties: {
      fileIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of file IDs to organize',
      },
      names: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of new names for the files (without extension). Format: "restaurant-month-year" (e.g., "lateral-january-2025")',
      },
      targetFolder: {
        type: 'string',
        description: 'Target folder path (default: "Receipts/Organized")',
      },
    },
    required: ['fileIds', 'names'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const fileIds = args['fileIds'];
    const names = args['names'];
    const targetFolder = typeof args['targetFolder'] === 'string' ? args['targetFolder'] : 'Receipts/Organized';

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new Error('fileIds must be a non-empty array');
    }
    if (!Array.isArray(names) || names.length === 0) {
      throw new Error('names must be a non-empty array');
    }
    if (fileIds.length !== names.length) {
      throw new Error('fileIds and names arrays must have the same length');
    }

    // Find or create the target folder
    let targetFolderId = await findFolderByPath(targetFolder);
    if (targetFolderId === undefined) {
      targetFolderId = await createFolderPath(targetFolder);
    }

    const results: string[] = [];
    let successCount = 0;

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const newBaseName = names[i];

      if (typeof fileId !== 'string' || typeof newBaseName !== 'string') {
        results.push(`[SKIP] Invalid entry at index ${i}`);
        continue;
      }

      try {
        // Get file to preserve extension
        const file = await getFile(fileId);
        const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
        const newName = `${newBaseName}${ext}`;

        // Rename the file
        await renameFile(fileId, newName);

        // Move to target folder
        await moveFile(fileId, targetFolderId);

        results.push(`[OK] ${file.name} -> ${newName}`);
        successCount++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push(`[ERROR] File ${fileId}: ${errMsg}`);
      }
    }

    const summary = [
      `Organized ${successCount} of ${fileIds.length} receipt${fileIds.length === 1 ? '' : 's'} to ${targetFolder}`,
      '',
      ...results,
    ];

    return textResult(summary.join('\n'));
  },
};

/**
 * All Drive MCP tools
 */
export const driveTools: MCPTool[] = [
  driveListTool,
  driveDownloadTool,
  driveRenameTool,
  driveMoveTool,
  driveReceiptsTool,
  driveOrganizeReceiptsTool,
];

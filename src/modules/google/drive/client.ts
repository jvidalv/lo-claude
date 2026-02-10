import { google, drive_v3 } from 'googleapis';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoogleAuthClient } from '#modules/google/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Drive API scopes required by this module - full access for rename/move operations */
export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

/** Default temp folder for downloads (within module directory) */
export const DEFAULT_TEMP_FOLDER = resolve(__dirname.replace('/dist/', '/src/'), '.temp');

/** Drive file metadata */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  parents: string[];
}

/** Drive folder metadata */
export interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

/**
 * Get authenticated Drive API client
 */
async function getDriveClient(): Promise<drive_v3.Drive> {
  const auth = await getGoogleAuthClient(DRIVE_SCOPES);
  return google.drive({ version: 'v3', auth });
}

/**
 * List files in a folder
 */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const drive = await getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  });

  const files = response.data.files ?? [];

  return files.map((file) => ({
    id: file.id ?? '',
    name: file.name ?? '',
    mimeType: file.mimeType ?? '',
    size: file.size ?? '0',
    createdTime: file.createdTime ?? '',
    modifiedTime: file.modifiedTime ?? '',
    parents: file.parents ?? [],
  }));
}

/**
 * Find a folder by path (e.g., "Receipts/Inbox")
 * Returns the folder ID if found, undefined otherwise
 */
export async function findFolderByPath(path: string): Promise<string | undefined> {
  const drive = await getDriveClient();
  const parts = path.split('/').filter((p) => p !== '');

  let parentId = 'root';

  for (const folderName of parts) {
    const response = await drive.files.list({
      q: `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });

    const folder = response.data.files?.[0];
    if (folder?.id === undefined || folder.id === null) {
      return undefined;
    }

    parentId = folder.id as string;
  }

  return parentId;
}

/**
 * List files in a folder by path (e.g., "Receipts/Inbox")
 */
export async function listFilesByPath(path: string): Promise<DriveFile[]> {
  const folderId = await findFolderByPath(path);
  if (folderId === undefined) {
    throw new Error(`Folder not found: ${path}`);
  }
  return listFiles(folderId);
}

/**
 * Download a file and return its data as Buffer
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Download a file to a local path
 */
export async function downloadFileToPath(fileId: string, localPath: string): Promise<string> {
  const data = await downloadFile(fileId);

  // Ensure directory exists
  const dir = dirname(localPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(localPath, data);
  return localPath;
}

/**
 * Download a file to the temp folder, returning the local path
 */
export async function downloadFileToTemp(fileId: string, filename: string): Promise<string> {
  // Ensure temp folder exists
  if (!existsSync(DEFAULT_TEMP_FOLDER)) {
    mkdirSync(DEFAULT_TEMP_FOLDER, { recursive: true });
  }

  const localPath = resolve(DEFAULT_TEMP_FOLDER, filename);
  return downloadFileToPath(fileId, localPath);
}

/**
 * Rename a file
 */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  const drive = await getDriveClient();

  await drive.files.update({
    fileId,
    requestBody: { name: newName },
  });
}

/**
 * Move a file to another folder
 */
export async function moveFile(fileId: string, newFolderId: string): Promise<void> {
  const drive = await getDriveClient();

  // Get current parents
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
  });

  const previousParents = file.data.parents?.join(',') ?? '';

  // Move to new folder
  await drive.files.update({
    fileId,
    addParents: newFolderId,
    removeParents: previousParents,
  });
}

/**
 * Create a folder if it doesn't exist, returns folder ID
 */
export async function createFolder(name: string, parentId?: string): Promise<string> {
  const drive = await getDriveClient();

  // Check if folder already exists
  const parent = parentId ?? 'root';
  const response = await drive.files.list({
    q: `name = '${name}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  const existing = response.data.files?.[0];
  if (existing?.id !== undefined && existing.id !== null) {
    return existing.id as string;
  }

  // Create new folder
  const requestBody: drive_v3.Schema$File = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId !== undefined) {
    requestBody.parents = [parentId];
  }

  const createResponse = await drive.files.create({
    requestBody,
    fields: 'id',
  });

  const folderId = createResponse.data.id as string | undefined
  if (folderId === undefined || folderId === null) {
    throw new Error('Failed to create folder');
  }

  return folderId;
}

/**
 * Create folder path recursively (e.g., "Receipts/Organized")
 * Returns the final folder ID
 */
export async function createFolderPath(path: string): Promise<string> {
  const parts = path.split('/').filter((p) => p !== '');

  let parentId: string | undefined;

  for (const folderName of parts) {
    parentId = await createFolder(folderName, parentId);
  }

  if (parentId === undefined) {
    throw new Error('Failed to create folder path');
  }

  return parentId;
}

/**
 * Get file metadata by ID
 */
export async function getFile(fileId: string): Promise<DriveFile> {
  const drive = await getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents',
  });

  return {
    id: response.data.id ?? '',
    name: response.data.name ?? '',
    mimeType: response.data.mimeType ?? '',
    size: response.data.size ?? '0',
    createdTime: response.data.createdTime ?? '',
    modifiedTime: response.data.modifiedTime ?? '',
    parents: response.data.parents ?? [],
  };
}

/**
 * Generate a suggested receipt filename from file metadata
 * Format: restaurant-month-year.ext (e.g., unknown-january-2025.jpg)
 */
export function generateReceiptFilename(file: DriveFile): string {
  const date = new Date(file.createdTime || file.modifiedTime);
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  // Get extension from original filename
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  const extension = ext !== '' ? `.${ext}` : '';

  return `unknown-${month}-${year}${extension}`;
}

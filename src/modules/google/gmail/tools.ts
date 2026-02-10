import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MCPTool, MCPToolResult } from '#core/types.js';
import {
  listEmails,
  readEmail,
  searchEmails,
  searchInvoiceEmails,
  downloadAttachment,
  generateInvoiceFilename,
  type EmailSummary,
  type EmailMessage,
  type EmailWithAttachments,
} from '#modules/google/gmail/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default temp folder for downloads (within module directory) */
const DEFAULT_TEMP_FOLDER = resolve(__dirname.replace('/dist/', '/src/'), '.temp');

/**
 * Extract initials from a name or email
 */
function getInitial(from: string): string {
  // Try to get name from "Name <email>" format
  const nameMatch = from.match(/^"?([^"<]+)/);
  if (nameMatch !== null) {
    const name = nameMatch[1]?.trim() ?? '';
    // Find first letter (skip quotes and spaces)
    const letterMatch = name.match(/[a-zA-Z]/);
    if (letterMatch !== null) {
      return letterMatch[0].toUpperCase();
    }
  }
  // Fall back to first letter of email
  const emailMatch = from.match(/<([^>]+)>/) ?? from.match(/^([^\s]+)/);
  if (emailMatch !== null) {
    const email = emailMatch[1] ?? '';
    const letterMatch = email.match(/[a-zA-Z]/);
    if (letterMatch !== null) {
      return letterMatch[0].toUpperCase();
    }
  }
  return '?';
}

/**
 * Extract display name from email address
 */
function getDisplayName(from: string): string {
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch !== null) {
    const name = nameMatch[1]?.trim() ?? '';
    if (name !== '') {
      return name.replace(/"/g, '');
    }
  }
  const emailMatch = from.match(/<([^>]+)>/);
  if (emailMatch !== null) {
    return emailMatch[1] ?? from;
  }
  return from;
}

/**
 * Format relative date
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLen: number): string {
  const decoded = decodeHtmlEntities(text);
  if (decoded.length <= maxLen) return decoded;
  return decoded.slice(0, maxLen - 1) + '…';
}

/**
 * Format email list for terminal display
 */
function formatEmailList(emails: EmailSummary[]): string {
  if (emails.length === 0) {
    return 'No emails found.';
  }

  const lines: string[] = [];
  lines.push(`Found ${emails.length} email${emails.length === 1 ? '' : 's'}:\n`);

  for (const email of emails) {
    const initial = getInitial(email.from);
    const name = getDisplayName(email.from);
    const date = formatDate(email.date);
    const unread = email.labelIds.includes('UNREAD') ? '*' : ' ';
    const subject = truncate(email.subject || '(no subject)', 50);
    const snippet = truncate(email.snippet, 60);

    lines.push(`${unread}[${initial}] ${truncate(name, 20).padEnd(20)} ${date.padStart(10)}`);
    lines.push(`     ${subject}`);
    lines.push(`     ${snippet}`);
    lines.push(`     id:${email.id}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format single email for terminal display
 */
function formatEmail(email: EmailMessage): string {
  const lines: string[] = [];
  const initial = getInitial(email.from);
  const fromName = getDisplayName(email.from);
  const date = new Date(email.date).toLocaleString();

  lines.push('┌' + '─'.repeat(60) + '┐');
  lines.push(`│ [${initial}] ${truncate(fromName, 54).padEnd(54)} │`);
  lines.push('├' + '─'.repeat(60) + '┤');
  lines.push(`│ From: ${truncate(email.from, 51).padEnd(51)} │`);
  lines.push(`│ To:   ${truncate(email.to, 51).padEnd(51)} │`);
  lines.push(`│ Date: ${truncate(date, 51).padEnd(51)} │`);
  lines.push('├' + '─'.repeat(60) + '┤');
  lines.push(`│ ${truncate(email.subject || '(no subject)', 58).padEnd(58)} │`);
  lines.push('└' + '─'.repeat(60) + '┘');
  lines.push('');
  lines.push(email.body || email.snippet || '(no content)');

  return lines.join('\n');
}

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
 * gmail_list - List emails from Gmail
 */
const gmailListTool: MCPTool = {
  name: 'gmail_list',
  description:
    'List emails from Gmail inbox. Returns email summaries with id, subject, from, to, date, and snippet.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Maximum number of emails to return (default: 10, max: 100)',
      },
      query: {
        type: 'string',
        description:
          'Gmail search query (e.g., "is:unread", "from:someone@example.com", "subject:meeting")',
      },
      labelIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Filter by label IDs (e.g., ["INBOX", "UNREAD"]). Common labels: INBOX, SENT, DRAFT, SPAM, TRASH, UNREAD, STARRED, IMPORTANT',
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const maxResultsArg = typeof args['maxResults'] === 'number' ? args['maxResults'] : undefined;
    const query = typeof args['query'] === 'string' ? args['query'] : undefined;
    const labelIds = Array.isArray(args['labelIds'])
      ? (args['labelIds'] as string[])
      : undefined;

    const maxResults = maxResultsArg !== undefined ? Math.min(maxResultsArg, 100) : 10;

    const emails = await listEmails({
      maxResults,
      query,
      labelIds,
    });

    return textResult(formatEmailList(emails));
  },
};

/**
 * gmail_read - Read a specific email by ID
 */
const gmailReadTool: MCPTool = {
  name: 'gmail_read',
  description:
    'Read the full content of a specific email by its ID. Returns the complete email including body.',
  inputSchema: {
    type: 'object',
    properties: {
      messageId: {
        type: 'string',
        description: 'The ID of the email message to read (obtained from gmail_list)',
      },
    },
    required: ['messageId'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const messageId = args['messageId'];

    if (typeof messageId !== 'string' || messageId === '') {
      throw new Error('messageId is required and must be a non-empty string');
    }

    const email = await readEmail(messageId);

    return textResult(formatEmail(email));
  },
};

/**
 * gmail_search - Search emails with Gmail query syntax
 */
const gmailSearchTool: MCPTool = {
  name: 'gmail_search',
  description:
    'Search emails using Gmail query syntax. Supports operators like from:, to:, subject:, is:unread, has:attachment, after:, before:, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Gmail search query. Examples:\n' +
          '- "from:someone@example.com"\n' +
          '- "subject:meeting is:unread"\n' +
          '- "has:attachment larger:5M"\n' +
          '- "after:2024/01/01 before:2024/12/31"\n' +
          '- "in:sent to:team@company.com"',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 100)',
      },
    },
    required: ['query'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const query = args['query'];
    const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : undefined;

    if (typeof query !== 'string' || query === '') {
      throw new Error('query is required and must be a non-empty string');
    }

    const emails = await searchEmails({
      query,
      maxResults: maxResults !== undefined ? Math.min(maxResults, 100) : 10,
    });

    return textResult(`Search: "${query}"\n\n` + formatEmailList(emails));
  },
};

/**
 * Format invoice email list for display
 */
function formatInvoiceList(emails: EmailWithAttachments[]): string {
  if (emails.length === 0) {
    return 'No invoice emails found.';
  }

  const lines: string[] = [];
  lines.push(`Found ${emails.length} invoice email${emails.length === 1 ? '' : 's'}:\n`);

  for (const email of emails) {
    const name = getDisplayName(email.from);
    const date = formatDate(email.date);
    const unread = email.labelIds.includes('UNREAD') ? '[UNREAD]' : '[READ]';
    const subject = truncate(email.subject || '(no subject)', 50);

    lines.push(`${unread} ${truncate(name, 25).padEnd(25)} ${date.padStart(12)}`);
    lines.push(`  Subject: ${subject}`);
    lines.push(`  Attachments:`);

    for (const att of email.attachments) {
      const suggestedName = generateInvoiceFilename(email, att.filename);
      const sizeKB = Math.round(att.size / 1024);
      lines.push(`    - ${att.filename} (${sizeKB}KB) → ${suggestedName}`);
    }

    lines.push(`  id:${email.id}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * gmail_invoices - List emails with invoices/receipts
 */
const gmailInvoicesTool: MCPTool = {
  name: 'gmail_invoices',
  description:
    'List emails containing invoices or receipts with PDF attachments. Shows sender, date, subject, attachment names, and suggested filenames for download.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'number',
        description: 'Maximum number of invoice emails to return (default: 20, max: 100)',
      },
      afterDate: {
        type: 'string',
        description: 'Only show invoices after this date. Format: YYYY/MM/DD (e.g., "2025/10/01" for October 2025)',
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const maxResultsArg = typeof args['maxResults'] === 'number' ? args['maxResults'] : undefined;
    const afterDate = typeof args['afterDate'] === 'string' ? args['afterDate'] : undefined;

    const maxResults = maxResultsArg !== undefined ? Math.min(maxResultsArg, 100) : 20;

    const emails = await searchInvoiceEmails({
      maxResults,
      afterDate,
    });

    return textResult(formatInvoiceList(emails));
  },
};

/**
 * gmail_download_invoices - Download invoice PDFs from emails
 */
const gmailDownloadInvoicesTool: MCPTool = {
  name: 'gmail_download_invoices',
  description:
    'Download PDF attachments from invoice emails. Files are named using format: sender-month-year.pdf (e.g., supabase-november-2025.pdf). By default saves to the module .temp folder.',
  inputSchema: {
    type: 'object',
    properties: {
      messageIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of email message IDs to download attachments from (obtained from gmail_invoices)',
      },
      outputFolder: {
        type: 'string',
        description: 'Folder path where PDFs will be saved. Defaults to module .temp folder if not specified.',
      },
    },
    required: ['messageIds'],
  },
  handler: async (args: Record<string, unknown>): Promise<MCPToolResult> => {
    const messageIds = args['messageIds'];
    const outputFolderArg = args['outputFolder'];

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('messageIds must be a non-empty array of email IDs');
    }

    // Use default temp folder if not specified
    const outputFolder = typeof outputFolderArg === 'string' && outputFolderArg !== ''
      ? outputFolderArg
      : DEFAULT_TEMP_FOLDER;

    // Ensure output folder exists
    const folderPath = resolve(outputFolder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const results: string[] = [];
    const downloaded: string[] = [];

    // First, get email details with attachments for each message
    const emails = await searchInvoiceEmails({ maxResults: 100, afterDate: undefined });
    const emailMap = new Map(emails.map((e) => [e.id, e]));

    for (const msgId of messageIds) {
      if (typeof msgId !== 'string') continue;

      const email = emailMap.get(msgId);
      if (email === undefined) {
        results.push(`[SKIP] ${msgId}: Email not found or has no PDF attachments`);
        continue;
      }

      for (const att of email.attachments) {
        try {
          const data = await downloadAttachment(msgId, att.attachmentId);
          const filename = generateInvoiceFilename(email, att.filename);
          const filePath = resolve(folderPath, filename);

          // Handle duplicate filenames by adding a number
          let finalPath = filePath;
          let counter = 1;
          while (existsSync(finalPath)) {
            const base = filename.replace('.pdf', '');
            finalPath = resolve(folderPath, `${base}-${counter}.pdf`);
            counter++;
          }

          writeFileSync(finalPath, data);
          downloaded.push(finalPath);
          results.push(`[OK] ${filename} (${Math.round(data.length / 1024)}KB)`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.push(`[ERROR] ${att.filename}: ${errMsg}`);
        }
      }
    }

    const summary = [
      `Downloaded ${downloaded.length} file${downloaded.length === 1 ? '' : 's'} to ${folderPath}`,
      '',
      ...results,
    ];

    return textResult(summary.join('\n'));
  },
};

/**
 * All Gmail MCP tools
 */
export const gmailTools: MCPTool[] = [
  gmailListTool,
  gmailReadTool,
  gmailSearchTool,
  gmailInvoicesTool,
  gmailDownloadInvoicesTool,
];

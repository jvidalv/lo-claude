import { google, gmail_v1 } from 'googleapis';
import { getGoogleAuthClient } from '#modules/google/auth.js';

/** Gmail API scopes required by this module */
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

/** Email message summary */
export interface EmailSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
}

/** Full email message */
export interface EmailMessage extends EmailSummary {
  body: string;
  bodyHtml: string | undefined;
}

/** Email attachment metadata */
export interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Email with attachment info */
export interface EmailWithAttachments extends EmailSummary {
  attachments: AttachmentInfo[];
}

/**
 * Get authenticated Gmail API client
 */
async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const auth = await getGoogleAuthClient(GMAIL_SCOPES);
  return google.gmail({ version: 'v1', auth });
}

/**
 * Extract header value from message headers
 */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  if (headers === undefined) {
    return '';
  }
  const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? '';
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract body from message parts
 */
function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined
): { text: string; html: string | undefined } {
  if (payload === undefined) {
    return { text: '', html: undefined };
  }

  // Simple message with body data
  if (payload.body?.data !== undefined && payload.body.data !== null) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      return { text: '', html: decoded };
    }
    return { text: decoded, html: undefined };
  }

  // Multipart message
  if (payload.parts !== undefined) {
    let text = '';
    let html: string | undefined;

    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data !== undefined && part.body.data !== null) {
        text = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data !== undefined && part.body.data !== null) {
        html = decodeBase64Url(part.body.data);
      } else if (part.parts !== undefined) {
        // Nested multipart
        const nested = extractBody(part);
        if (nested.text !== '') {
          text = nested.text;
        }
        if (nested.html !== undefined) {
          html = nested.html;
        }
      }
    }

    return { text, html };
  }

  return { text: '', html: undefined };
}

/**
 * Convert API message to EmailSummary
 */
function toEmailSummary(message: gmail_v1.Schema$Message): EmailSummary {
  const headers = message.payload?.headers;

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    snippet: message.snippet ?? '',
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    date: getHeader(headers, 'Date'),
    labelIds: message.labelIds ?? [],
  };
}

/**
 * Convert API message to full EmailMessage
 */
function toEmailMessage(message: gmail_v1.Schema$Message): EmailMessage {
  const summary = toEmailSummary(message);
  const { text, html } = extractBody(message.payload);

  return {
    ...summary,
    body: text,
    bodyHtml: html,
  };
}

/**
 * List emails from Gmail
 */
export async function listEmails(options: {
  maxResults: number;
  query: string | undefined;
  labelIds: string[] | undefined;
}): Promise<EmailSummary[]> {
  const gmail = await getGmailClient();

  const listParams: gmail_v1.Params$Resource$Users$Messages$List = {
    userId: 'me',
    maxResults: options.maxResults,
  };

  if (options.query !== undefined) {
    listParams.q = options.query;
  }

  if (options.labelIds !== undefined) {
    listParams.labelIds = options.labelIds;
  }

  const response = await gmail.users.messages.list(listParams);

  const messages = response.data.messages ?? [];
  const emails: EmailSummary[] = [];

  // Fetch details for each message
  for (const msg of messages) {
    if (msg.id === undefined || msg.id === null) {
      continue;
    }

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date'],
    });

    emails.push(toEmailSummary(detail.data));
  }

  return emails;
}

/**
 * Read a specific email by ID
 */
export async function readEmail(messageId: string): Promise<EmailMessage> {
  const gmail = await getGmailClient();

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return toEmailMessage(response.data);
}

/**
 * Search emails with Gmail query syntax
 */
export async function searchEmails(options: {
  query: string;
  maxResults: number;
}): Promise<EmailSummary[]> {
  return listEmails({
    query: options.query,
    maxResults: options.maxResults,
    labelIds: undefined,
  });
}

/**
 * Extract attachments from message parts recursively
 */
function extractAttachments(
  parts: gmail_v1.Schema$MessagePart[] | undefined,
  messageId: string
): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];

  if (parts === undefined) {
    return attachments;
  }

  for (const part of parts) {
    // Check if this part is an attachment
    if (
      part.filename !== undefined &&
      part.filename !== null &&
      part.filename !== '' &&
      part.body?.attachmentId !== undefined &&
      part.body.attachmentId !== null
    ) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        size: part.body.size ?? 0,
      });
    }

    // Recurse into nested parts
    if (part.parts !== undefined) {
      attachments.push(...extractAttachments(part.parts, messageId));
    }
  }

  return attachments;
}

/**
 * Search for emails with invoices/receipts and PDF attachments
 */
export async function searchInvoiceEmails(options: {
  maxResults: number;
  afterDate: string | undefined;
}): Promise<EmailWithAttachments[]> {
  const gmail = await getGmailClient();

  // Build query for invoices/receipts with attachments
  // Common terms: invoice, receipt, factura, recibo, payment, order confirmation
  let query = 'has:attachment (filename:pdf OR filename:PDF) (invoice OR receipt OR factura OR recibo OR "payment confirmation" OR "order confirmation" OR billing OR subscription)';

  if (options.afterDate !== undefined) {
    query += ` after:${options.afterDate}`;
  }

  const listParams: gmail_v1.Params$Resource$Users$Messages$List = {
    userId: 'me',
    maxResults: options.maxResults,
    q: query,
  };

  const response = await gmail.users.messages.list(listParams);
  const messages = response.data.messages ?? [];
  const emails: EmailWithAttachments[] = [];

  for (const msg of messages) {
    if (msg.id === undefined || msg.id === null) {
      continue;
    }

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const summary = toEmailSummary(detail.data);
    const attachments = extractAttachments(detail.data.payload?.parts, msg.id);

    // Filter to only PDF attachments
    const pdfAttachments = attachments.filter(
      (a) => a.mimeType === 'application/pdf' || a.filename.toLowerCase().endsWith('.pdf')
    );

    if (pdfAttachments.length > 0) {
      emails.push({
        ...summary,
        attachments: pdfAttachments,
      });
    }
  }

  return emails;
}

/**
 * Download an attachment and return its data
 */
export async function downloadAttachment(
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const gmail = await getGmailClient();

  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });

  const data = response.data.data;
  if (data === undefined || data === null) {
    throw new Error('Attachment data is empty');
  }

  // Gmail API returns base64url encoded data
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

/**
 * Generate a filename for an invoice based on sender and date
 * Format: sender-month-year.pdf (e.g., supabase-november-2025.pdf)
 */
export function generateInvoiceFilename(email: EmailSummary, originalFilename: string): string {
  // Extract sender name/domain
  const fromMatch = email.from.match(/<([^>]+)>/) ?? email.from.match(/^([^\s]+)/);
  let sender = 'unknown';

  if (fromMatch !== null) {
    const emailAddr = fromMatch[1] ?? '';
    // Get domain or first part
    const domainMatch = emailAddr.match(/@([^.]+)/);
    if (domainMatch !== null) {
      sender = domainMatch[1]?.toLowerCase() ?? 'unknown';
    } else {
      sender = emailAddr.split('@')[0]?.toLowerCase() ?? 'unknown';
    }
  }

  // Parse date
  const date = new Date(email.date);
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  // Get extension from original filename
  const ext = originalFilename.toLowerCase().endsWith('.pdf') ? '.pdf' : '';

  return `${sender}-${month}-${year}${ext}`;
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type CookieParam } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Module directory */
const MODULE_DIR = __dirname.replace('/dist/', '/src/');

/** Cookies file path */
const COOKIES_PATH = resolve(MODULE_DIR, 'cookies.txt');

/** User-Agent file path */
const USER_AGENT_PATH = resolve(MODULE_DIR, 'user-agent.txt');

/** Default User-Agent (Chrome on macOS) */
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

/** Cached cookies and user agent */
let cachedCookies: CookieParam[] | null = null;
let cachedUserAgent: string | null = null;

/**
 * Sanitize user-generated content to prevent prompt injection.
 */
function sanitizeContent(text: string): string {
  return text
    .replace(/</g, '\uff1c')
    .replace(/>/g, '\uff1e')
    .replace(/\[/g, '\uff3b')
    .replace(/\]/g, '\uff3d')
    .replace(/\{/g, '\uff5b')
    .replace(/\}/g, '\uff5d')
    .replace(/\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)/gi,
      (match) => match.split('').join('\u200B'))
    .replace(/\b(system|assistant|user|human)\s*(prompt|message|instruction)/gi,
      (match) => match.split('').join('\u200B'))
    .replace(/\b(you\s+are|act\s+as|pretend\s+to\s+be)/gi,
      (match) => match.split('').join('\u200B'));
}

/**
 * Load cookies from file (Netscape format) and convert to Puppeteer format
 */
function loadCookies(): CookieParam[] {
  if (!existsSync(COOKIES_PATH)) {
    throw new Error(
      `Cookies file not found: ${COOKIES_PATH}\n` +
      'Please export cookies from your browser.\n\n' +
      'Using Chrome:\n' +
      '1. Install "Get cookies.txt LOCALLY" extension\n' +
      '2. Go to forocoches.com and log in\n' +
      '3. Click the extension and export cookies\n' +
      '4. Save as cookies.txt in src/modules/forocoches/'
    );
  }

  const content = readFileSync(COOKIES_PATH, 'utf-8');

  const cookies: CookieParam[] = [];

  for (const line of content.split('\n')) {
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length >= 7) {
      const domain = parts[0] ?? '';
      const path = parts[2] ?? '/';
      const secure = parts[3] === 'TRUE';
      const expiry = parseInt(parts[4] ?? '0', 10);
      const name = parts[5] ?? '';
      const value = parts[6] ?? '';

      cookies.push({
        name,
        value,
        domain: domain.startsWith('.') ? domain : `.${domain}`,
        path,
        secure,
        sameSite: 'Lax' as const,
        expires: expiry > 0 ? expiry : -1,
      });
    }
  }

  return cookies;
}

/**
 * Load User-Agent from file or return default
 */
function loadUserAgent(): string {
  if (existsSync(USER_AGENT_PATH)) {
    return readFileSync(USER_AGENT_PATH, 'utf-8').trim();
  }
  return DEFAULT_USER_AGENT;
}

/** Post data structure */
export interface ForumPost {
  id: string;
  author: string;
  authorId: string;
  date: string;
  content: string;
  quotes: string[];
  likes: number;
  pageNumber: number;
}

/** Thread data structure */
export interface ForumThread {
  id: string;
  title: string;
  url: string;
  totalPages: number;
  posts: ForumPost[];
}

/**
 * Get cached cookies (loads once)
 */
function getCookies(): CookieParam[] {
  if (!cachedCookies) {
    cachedCookies = loadCookies();
  }
  return cachedCookies;
}

/**
 * Get cached user agent (loads once)
 */
function getUserAgent(): string {
  if (!cachedUserAgent) {
    cachedUserAgent = loadUserAgent();
  }
  return cachedUserAgent;
}

/**
 * Fetch a page using Puppeteer (handles session cookies)
 */
async function fetchWithPuppeteer(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...getCookies());
    await page.setUserAgent(getUserAgent());

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}

/**
 * Strip HTML tags and normalize whitespace for plain text output
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/li>/gi, ' ')
    .replace(/<h[23][^>]*>/gi, ' ')
    .replace(/<\/h[23]>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the full content of a post_message div by matching nested divs.
 * The lazy regex approach fails because the message contains nested divs (quotes).
 */
function extractPostMessage(html: string, postId: string): string {
  const marker = `id="post_message_${postId}"`;
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return '';

  // Find the opening > of this div
  const openTag = html.indexOf('>', startIdx);
  if (openTag === -1) return '';

  // Track nested divs to find the matching closing </div>
  let depth = 1;
  let pos = openTag + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.substring(openTag + 1, nextClose);
      }
      pos = nextClose + 6;
    }
  }

  return '';
}

/**
 * Parse HTML to extract posts from a Forocoches page (vBulletin)
 */
function parseThreadPage(html: string, pageNumber: number): { posts: ForumPost[]; totalPages: number; title: string } {
  const posts: ForumPost[] = [];

  // Extract title from <title> tag — vBulletin puts thread title there
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch?.[1]?.trim() ?? 'Unknown';
  // vBulletin titles often end with " - ForoCoches" or similar suffix
  title = title.replace(/\s*-\s*ForoCoches.*$/i, '').trim();
  title = sanitizeContent(title);

  // Extract total pages from "Page X of Y" text in .pagenav
  let totalPages = 1;
  const pageNavMatch = html.match(/Page\s+\d+\s+of\s+(\d+)/i);
  if (pageNavMatch?.[1]) {
    totalPages = parseInt(pageNavMatch[1], 10);
  }

  // Split by vBulletin comment markers: <!-- post #ID --> ... <!-- / post #ID -->
  const postBlockMatches = html.matchAll(/<!-- post #(\d+) -->([\s\S]*?)<!-- \/ post #\1 -->/g);

  for (const match of postBlockMatches) {
    const postId = match[1];
    const postBlock = match[2];

    if (!postId || !postBlock) continue;

    // Extract author from a.bigusername
    const authorMatch = postBlock.match(/<a[^>]*class="bigusername"[^>]*>([^<]+)<\/a>/i);
    const author = sanitizeContent(authorMatch?.[1]?.trim() ?? 'Unknown');

    // Extract author ID from member.php?u=ID href
    const authorIdMatch = postBlock.match(/member\.php\?u=(\d+)/i);
    const authorId = authorIdMatch?.[1] ?? '0';

    // Extract date from the thead cell (plain text like "09-feb-2026, 11:26" or "Ayer, 20:06")
    const dateMatch = postBlock.match(/(\d{1,2}-\w{3}-\d{4}),?\s*(\d{1,2}:\d{2})/i)
      ?? postBlock.match(/(Hoy|Ayer|Today|Yesterday),?\s*(\d{1,2}:\d{2})/i)
      ?? postBlock.match(/(\d{1,2}\s+\w+\s+\d{4})/i);
    let date = '';
    if (dateMatch) {
      date = dateMatch[0].trim();
    }

    // Extract full post message content (handles nested divs properly)
    const messageHtml = extractPostMessage(html, postId);

    // Extract quotes from the message.
    // vBulletin quotes: <div style="margin:20px..."><div class="smallfont">Cita:</div><table>...<td class="alt2">...quoted content...</td>...</table></div>
    const quotes: string[] = [];
    const quoteBlockMatches = messageHtml.matchAll(/<div[^>]*style="margin:20px[^"]*"[^>]*>([\s\S]*?)<\/table>\s*<\/div>/gi);
    for (const qMatch of quoteBlockMatches) {
      if (qMatch[1]) {
        // Extract quoted author
        const quoteAuthorMatch = qMatch[1].match(/Cita de\s+<b>([^<]+)<\/b>/i);
        const quoteAuthor = quoteAuthorMatch?.[1] ?? '';
        // Extract quoted text from the italic div
        const quoteTextMatch = qMatch[1].match(/<div[^>]*style="font-style:italic"[^>]*>([\s\S]*?)<\/div>/i);
        const quoteText = quoteTextMatch?.[1] ? stripHtml(quoteTextMatch[1]) : stripHtml(qMatch[1]);
        const prefix = quoteAuthor ? `@${quoteAuthor}: ` : '';
        quotes.push(sanitizeContent(`${prefix}${quoteText}`));
      }
    }

    // Remove quote blocks from message to get the reply text only
    let replyHtml = messageHtml.replace(/<div[^>]*style="margin:20px[^"]*"[^>]*>[\s\S]*?<\/table>\s*<\/div>/gi, '');
    let content = stripHtml(replyHtml);
    content = sanitizeContent(content);

    // Build full content: quotes first, then reply
    let fullContent = '';
    if (quotes.length > 0) {
      fullContent = quotes.map(q => `> ${q}`).join(' ') + ' | ';
    }
    fullContent += content;

    // Likes — absent on Forocoches, default to 0
    const likes = 0;

    posts.push({
      id: postId,
      author,
      authorId,
      date,
      content: fullContent,
      quotes,
      likes,
      pageNumber,
    });
  }

  return { posts, totalPages, title };
}

/**
 * Extract thread ID from URL
 * Handles ?t=ID and ?p=POST_ID patterns
 */
function extractThreadId(url: string): string {
  const urlObj = new URL(url);
  const threadId = urlObj.searchParams.get('t');
  if (threadId) return threadId;

  const postId = urlObj.searchParams.get('p');
  if (postId) return `p${postId}`;

  // Fallback: extract any number from the URL
  const match = url.match(/(\d+)/);
  return match?.[1] ?? '';
}

/**
 * Build page URL for Forocoches
 * Appends &page=N to the base URL
 */
function buildPageUrl(url: string, page: number): string {
  const urlObj = new URL(url);
  // Remove fragment
  urlObj.hash = '';
  if (page > 1) {
    urlObj.searchParams.set('page', String(page));
  }
  return urlObj.toString();
}

/**
 * Get a single page of a thread
 */
export async function getThreadPage(url: string, page: number = 1): Promise<{ posts: ForumPost[]; totalPages: number; title: string }> {
  const pageUrl = buildPageUrl(url, page);
  const html = await fetchWithPuppeteer(pageUrl);
  return parseThreadPage(html, page);
}

/**
 * Get entire thread (all pages)
 */
export async function getThread(url: string, maxPages: number = 100): Promise<ForumThread> {
  const threadId = extractThreadId(url);

  // Get first page to know total pages
  const firstPage = await getThreadPage(url, 1);
  const allPosts = [...firstPage.posts];
  const totalPages = Math.min(firstPage.totalPages, maxPages);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const pageData = await getThreadPage(url, page);
    allPosts.push(...pageData.posts);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    id: threadId,
    title: firstPage.title,
    url,
    totalPages,
    posts: allPosts,
  };
}

/** Result of posting a reply */
export interface PostReplyResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

/**
 * Post a reply to a Forocoches thread using the quick reply form
 */
export async function postReply(threadUrl: string, message: string): Promise<PostReplyResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...getCookies());
    await page.setUserAgent(getUserAgent());

    // Navigate to last page (quick reply form is there)
    await page.goto(threadUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Check if there are multiple pages — go to last page
    const lastPageLink = await page.$('.pagenav a[title="Last Page"]');
    if (lastPageLink) {
      const lastPageHref = await lastPageLink.evaluate((el) => (el as unknown as { href: string }).href);
      if (lastPageHref) {
        await page.goto(lastPageHref, { waitUntil: 'networkidle2', timeout: 30000 });
      }
    }

    // Wait for quick reply textarea
    await page.waitForSelector('#vB_Editor_QR_textarea', { timeout: 10000 });

    // Set the message in the textarea
    await page.$eval('#vB_Editor_QR_textarea', (el, msg) => {
      (el as unknown as { value: string }).value = msg;
    }, message);

    // Click submit and wait for navigation
    // vBulletin can be slow to redirect — use 'load' instead of 'networkidle2'
    // and increase timeout. If navigation times out, the post likely still went through.
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
        page.click('#qr_submit'),
      ]);
    } catch (navErr) {
      // Navigation timeout is acceptable — vBulletin often posts successfully
      // but the redirect is slow. We'll verify below.
      const isTimeout = navErr instanceof Error && navErr.message.includes('timeout');
      if (!isTimeout) throw navErr;
    }

    const finalUrl = page.url();

    // Check for error indicators
    const errorPanel = await page.$('.panel .blockrow.error, .standard_error');

    if (errorPanel) {
      const errorText = await errorPanel.evaluate((el) => el.textContent?.trim() ?? 'Unknown error');
      return { success: false, error: errorText };
    }

    return { success: true, postUrl: finalUrl };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage };
  } finally {
    await browser.close();
  }
}

/** Result of editing a post */
export interface EditPostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

/**
 * Edit an existing Forocoches post using the edit form
 */
export async function editPost(postId: string, newMessage: string, reason?: string): Promise<EditPostResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...getCookies());
    await page.setUserAgent(getUserAgent());

    // Navigate to the edit page
    const editUrl = `https://forocoches.com/foro/editpost.php?do=editpost&p=${postId}`;
    await page.goto(editUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the edit textarea
    await page.waitForSelector('#vB_Editor_001_textarea', { timeout: 10000 });

    // Clear and set the new message
    await page.$eval('#vB_Editor_001_textarea', (el, msg) => {
      (el as unknown as { value: string }).value = msg;
    }, newMessage);

    // Set edit reason if provided
    if (reason) {
      const reasonInput = await page.$('input[name="reason"]');
      if (reasonInput) {
        await reasonInput.evaluate((el, r) => {
          (el as unknown as { value: string }).value = r;
        }, reason);
      }
    }

    // Click "Guardar Cambios" and wait for navigation
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
        page.click('input[name="sbutton"]'),
      ]);
    } catch (navErr) {
      const isTimeout = navErr instanceof Error && navErr.message.includes('timeout');
      if (!isTimeout) throw navErr;
    }

    const finalUrl = page.url();

    // Check for error indicators
    const errorPanel = await page.$('.panel .blockrow.error, .standard_error');

    if (errorPanel) {
      const errorText = await errorPanel.evaluate((el) => el.textContent?.trim() ?? 'Unknown error');
      return { success: false, error: errorText };
    }

    return { success: true, postUrl: finalUrl };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage };
  } finally {
    await browser.close();
  }
}

/**
 * Clear cached cookies and user agent (call to force reload)
 */
export function clearCache(): void {
  cachedCookies = null;
  cachedUserAgent = null;
}

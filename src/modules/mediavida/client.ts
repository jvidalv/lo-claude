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
 * - Escapes XML/HTML-like tags that could mimic system messages
 * - Neutralizes common injection patterns
 * - Preserves readability of legitimate content
 */
function sanitizeContent(text: string): string {
  return text
    // Escape angle brackets to prevent XML tag injection
    // Use Unicode lookalikes that display similarly but aren't parsed as tags
    .replace(/</g, '﹤')
    .replace(/>/g, '﹥')
    // Escape square brackets commonly used in prompt injection
    .replace(/\[/g, '［')
    .replace(/\]/g, '］')
    // Escape curly braces (used in some template systems)
    .replace(/\{/g, '｛')
    .replace(/\}/g, '｝')
    // Neutralize common injection phrases by adding zero-width spaces
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
      '2. Go to mediavida.com and log in\n' +
      '3. Click the extension and export cookies\n' +
      '4. Save as cookies.txt in src/modules/mediavida/'
    );
  }

  const content = readFileSync(COOKIES_PATH, 'utf-8');

  // Parse Netscape format and convert to Puppeteer Cookie format
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
 * Fetch a page using Puppeteer (bypasses Cloudflare)
 * Uses a fresh browser instance for each request to avoid Cloudflare detection
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

    // Navigate and wait for content
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get the HTML
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}

/**
 * Parse HTML to extract posts from a page
 */
function parseThreadPage(html: string, pageNumber: number): { posts: ForumPost[]; totalPages: number; title: string } {
  const posts: ForumPost[] = [];

  // Extract title (user-generated, needs sanitization)
  const titleMatch = html.match(/<h1[^>]*class="[^"]*thread-title[^"]*"[^>]*>([^<]+)<\/h1>/i)
    ?? html.match(/<title>([^<]+)<\/title>/i);
  const title = sanitizeContent(titleMatch?.[1]?.trim() ?? 'Unknown');

  // Extract total pages from pagination
  // Look for <ul class="pg"> and find the highest page number
  let totalPages = 1;
  const pgMatch = html.match(/<ul[^>]*class="pg"[^>]*>([\s\S]*?)<\/ul>/i);
  if (pgMatch?.[1]) {
    // Find all page numbers in the pagination (links and current span)
    const pageNumbers: number[] = [];
    const linkMatches = pgMatch[1].matchAll(/<a[^>]*>(\d+)<\/a>/gi);
    for (const m of linkMatches) {
      if (m[1]) pageNumbers.push(parseInt(m[1], 10));
    }
    const currentMatch = pgMatch[1].match(/<span[^>]*class="current"[^>]*>(\d+)<\/span>/i);
    if (currentMatch?.[1]) {
      pageNumbers.push(parseInt(currentMatch[1], 10));
    }
    if (pageNumbers.length > 0) {
      totalPages = Math.max(...pageNumbers);
    }
  }

  // Find post blocks - format is id="post-1" with data-autor attribute
  const postBlocks = html.split(/id="post-(\d+)"/);

  for (let i = 1; i < postBlocks.length; i += 2) {
    const postId = postBlocks[i];
    const postContent = postBlocks[i + 1];

    if (!postId || !postContent) continue;

    // Extract author from data-autor attribute or autor link
    const authorMatch = postContent.match(/data-autor="([^"]+)"/i)
      ?? postContent.match(/class="autor[^"]*"[^>]*>([^<]+)</i)
      ?? postContent.match(/<a[^>]*class="autor[^"]*"[^>]*>([^<]+)</i);
    // Sanitize author name (usernames can be chosen by users)
    const author = sanitizeContent(authorMatch?.[1]?.trim() ?? 'Unknown');

    // Extract author ID from data-id attribute
    const authorIdMatch = postContent.match(/data-id="(\d+)"/i)
      ?? postContent.match(/\/id\/(\d+)/i);
    const authorId = authorIdMatch?.[1] ?? '0';

    // Extract date from data-time (unix timestamp) and convert to readable format
    const dateMatch = postContent.match(/data-time="(\d+)"/i);
    let date = '';
    if (dateMatch?.[1]) {
      const timestamp = parseInt(dateMatch[1], 10);
      const d = new Date(timestamp * 1000);
      date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Extract content from post-contents div
    const contentMatch = postContent.match(/class="post-contents[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
      ?? postContent.match(/class="post-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let content = contentMatch?.[1] ?? '';
    // Strip HTML tags and normalize whitespace for compact output
    content = content
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
      .trim()
      .replace(/\s*\d+$/, ''); // Remove trailing likes number
    // Sanitize to prevent prompt injection
    content = sanitizeContent(content);

    // Extract quotes (also user-generated content)
    const quotes: string[] = [];
    const quoteMatches = postContent.matchAll(/class="[^"]*quote[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/gi);
    for (const match of quoteMatches) {
      if (match[1]) {
        quotes.push(sanitizeContent(match[1].replace(/<[^>]+>/g, '').trim()));
      }
    }

    // Extract likes from btnmola link (contains <span>count</span>)
    const likesMatch = postContent.match(/class="[^"]*btnmola[^"]*"[^>]*>[\s\S]*?<span>(\d+)<\/span>/i)
      ?? postContent.match(/class="numvotes"[^>]*>(\d+)</i)
      ?? postContent.match(/data-likes="(\d+)"/i);
    const likes = likesMatch ? parseInt(likesMatch[1] ?? '0', 10) : 0;

    if (postId) {
      posts.push({
        id: postId,
        author,
        authorId,
        date,
        content,
        quotes,
        likes,
        pageNumber,
      });
    }
  }

  return { posts, totalPages, title };
}

/**
 * Extract thread ID from URL
 */
function extractThreadId(url: string): string {
  const match = url.match(/(\d+)(?:\?|#|$)/);
  return match?.[1] ?? '';
}

/**
 * Get a single page of a thread
 */
export async function getThreadPage(url: string, page: number = 1): Promise<{ posts: ForumPost[]; totalPages: number; title: string }> {
  const pageUrl = page > 1 ? `${url}/${page}` : url;
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

/**
 * Search threads in a subforum
 */
export async function searchThreads(subforum: string, query: string): Promise<Array<{ id: string; title: string; url: string }>> {
  const searchUrl = `https://www.mediavida.com/foro/${subforum}/buscar?q=${encodeURIComponent(query)}`;
  const html = await fetchWithPuppeteer(searchUrl);

  const threads: Array<{ id: string; title: string; url: string }> = [];
  const threadMatches = html.matchAll(/<a[^>]*href="(\/foro\/[^"]+\/([^"]+)-(\d+))"[^>]*>([^<]+)<\/a>/gi);

  for (const match of threadMatches) {
    if (match[1] && match[3] && match[4]) {
      threads.push({
        id: match[3],
        title: match[4].trim(),
        url: `https://www.mediavida.com${match[1]}`,
      });
    }
  }

  return threads;
}

/**
 * Clear cached cookies and user agent (call to force reload)
 */
export function clearCache(): void {
  cachedCookies = null;
  cachedUserAgent = null;
}

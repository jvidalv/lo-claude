import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { GoogleCredentials, GoogleToken } from '#core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Google module directory (where credentials are stored) - always use src, not dist */
const GOOGLE_MODULE_DIR = __dirname.replace('/dist/', '/src/');

let cachedAuthClient: OAuth2Client | null = null;

/**
 * Get the paths for credentials and token files
 */
function getAuthPaths(): { credentialsPath: string; tokenPath: string } {
  return {
    credentialsPath: resolve(GOOGLE_MODULE_DIR, 'credentials.json'),
    tokenPath: resolve(GOOGLE_MODULE_DIR, 'token.json'),
  };
}

/**
 * Load credentials from file
 */
function loadCredentials(): GoogleCredentials {
  const { credentialsPath } = getAuthPaths();

  if (!existsSync(credentialsPath)) {
    throw new Error(
      `Credentials file not found: ${credentialsPath}\n` +
      'Please run /modules:gmail to configure Google OAuth credentials.'
    );
  }

  const content = readFileSync(credentialsPath, 'utf-8');
  return JSON.parse(content) as GoogleCredentials;
}

/**
 * Load saved token from file
 */
function loadToken(): GoogleToken | null {
  const { tokenPath } = getAuthPaths();

  if (!existsSync(tokenPath)) {
    return null;
  }

  try {
    const content = readFileSync(tokenPath, 'utf-8');
    return JSON.parse(content) as GoogleToken;
  } catch {
    return null;
  }
}

/**
 * Save token to file
 */
function saveToken(token: GoogleToken): void {
  const { tokenPath } = getAuthPaths();
  writeFileSync(tokenPath, JSON.stringify(token, null, 2));
}

/**
 * Create OAuth2 client from credentials
 */
function createOAuth2Client(credentials: GoogleCredentials): OAuth2Client {
  const clientConfig = credentials.installed ?? credentials.web;

  if (clientConfig === undefined) {
    throw new Error('Invalid credentials format. Expected "installed" or "web" credentials.');
  }

  const { client_id, client_secret, redirect_uris } = clientConfig;
  const redirectUri = redirect_uris?.[0] ?? 'http://localhost';

  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

/**
 * Get authenticated Google OAuth2 client
 *
 * This function:
 * 1. Loads credentials from credentials.json
 * 2. Loads existing token from token.json if available
 * 3. Returns authenticated client
 *
 * If no token exists, throws an error with instructions to authorize.
 */
export async function getGoogleAuthClient(scopes: string[]): Promise<OAuth2Client> {
  // Return cached client if available and token is valid
  if (cachedAuthClient !== null) {
    return cachedAuthClient;
  }

  const credentials = loadCredentials();
  const oauth2Client = createOAuth2Client(credentials);

  const token = loadToken();

  if (token === null) {
    // Generate auth URL for user to authorize
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    throw new Error(
      'No authorization token found. Please authorize the app:\n\n' +
      '1. Visit this URL:\n' +
      `   ${authUrl}\n\n` +
      '2. After authorizing, you will get a code.\n' +
      '3. Run this command to save the token:\n' +
      `   npx tsx src/modules/google/auth.ts <CODE>\n`
    );
  }

  // Set credentials on the client
  oauth2Client.setCredentials(token);

  // Set up automatic token refresh
  oauth2Client.on('tokens', (tokens) => {
    const newToken: GoogleToken = {
      access_token: tokens.access_token ?? token.access_token,
      refresh_token: tokens.refresh_token ?? token.refresh_token,
      scope: tokens.scope ?? token.scope,
      token_type: tokens.token_type ?? token.token_type,
      expiry_date: tokens.expiry_date ?? token.expiry_date,
    };
    saveToken(newToken);
  });

  cachedAuthClient = oauth2Client;
  return oauth2Client;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, scopes: string[]): Promise<void> {
  const credentials = loadCredentials();
  const oauth2Client = createOAuth2Client(credentials);

  const { tokens } = await oauth2Client.getToken(code);

  const token: GoogleToken = {
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? '',
    scope: tokens.scope ?? scopes.join(' '),
    token_type: tokens.token_type ?? 'Bearer',
    expiry_date: tokens.expiry_date ?? Date.now() + 3600000,
  };

  saveToken(token);
  console.log('Token saved successfully!');
}

/**
 * Clear cached auth client (useful for testing or re-auth)
 */
export function clearAuthCache(): void {
  cachedAuthClient = null;
}

// CLI interface for token exchange
const args = process.argv.slice(2);
if (args.length > 0 && args[0] !== undefined) {
  const code = args[0];
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

  exchangeCodeForTokens(code, scopes)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to exchange code:', error);
      process.exit(1);
    });
}

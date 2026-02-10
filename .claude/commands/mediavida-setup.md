# Mediavida Module Setup

Set up the Mediavida forum module for Lo-Claude.

This module allows Claude to read and summarize threads from mediavida.com, a Spanish forum.

## Prerequisites
- A Mediavida account (logged in via browser)
- Chrome browser with "Get cookies.txt LOCALLY" extension

## Why cookies are needed

Mediavida uses Cloudflare protection which requires browser cookies to bypass. The module uses Puppeteer (headless Chrome) with your session cookies to access the forum.

## Instructions

### 1. Install the browser extension

Install "Get cookies.txt LOCALLY" extension for Chrome:
https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc

### 2. Export your Mediavida cookies

1. Open Chrome and go to https://www.mediavida.com
2. Make sure you are **logged in** to your Mediavida account
3. Click the "Get cookies.txt LOCALLY" extension icon in your toolbar
4. Click "Export" to download the cookies file
5. The file will be downloaded as `cookies.txt`

### 3. Move the cookies file

Move the downloaded `cookies.txt` file to the mediavida module directory:

```bash
mv ~/Downloads/cookies.txt src/modules/mediavida/cookies.txt
```

### 4. Save your User-Agent (optional but recommended)

The User-Agent must match the browser that exported the cookies. Run this in your Chrome console to get it:

```javascript
navigator.userAgent
```

Save it to a file:

```bash
echo 'YOUR_USER_AGENT_STRING' > src/modules/mediavida/user-agent.txt
```

If you skip this step, a default Chrome User-Agent is used, which may not match your browser.

### 5. Enable the module

Update `lo-claude.config.json` to include mediavida in enabled modules:

```json
{
  "enabledModules": ["gmail", "mediavida"]
}
```

### 6. Restart Claude Code

Restart Claude Code for the changes to take effect. The mediavida tools will now be available.

## Available Tools

After setup, you'll have access to these MCP tools:

- **mediavida_thread** - Get and summarize a full thread (fetches all pages)
  - Parameters: `url` (required), `maxPages` (optional, default: 10)

- **mediavida_page** - Get a single page of a thread
  - Parameters: `url` (required), `page` (optional, default: 1)

## Example Usage

Once configured, you can ask Claude things like:

- "Summarize this mediavida thread: https://www.mediavida.com/foro/dev/hilo-xxx-123456"
- "Get page 2 of this thread: [url]"
- "What are the main topics discussed in this thread?"

## Troubleshooting

### Getting 403 errors

If you get 403 (Forbidden) errors, your cookies may have expired:

1. Go to mediavida.com in Chrome and make sure you're logged in
2. Re-export the cookies using the extension
3. Replace the `cookies.txt` file

### Cookies expire periodically

Cloudflare cookies (`cf_clearance`) expire periodically. If the module stops working after some time, simply re-export your cookies.

### User-Agent mismatch

The module uses a Chrome User-Agent. If you exported cookies from a different browser, you may get 403 errors. Always export from Chrome.

## Security Notes

- Never commit `cookies.txt` - it contains your session
- The file is in `.gitignore`
- Cookies are stored locally only
- The module only reads forum content (no posting capability)

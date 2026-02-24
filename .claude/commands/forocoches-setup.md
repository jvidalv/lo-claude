# Forocoches Module Setup

Set up the Forocoches forum module for Lo-Claude.

This module allows Claude to read and summarize threads from forocoches.com, a Spanish forum powered by vBulletin.

## Prerequisites
- A Forocoches account (logged in via browser)
- Chrome browser with "Get cookies.txt LOCALLY" extension

## Why cookies are needed

Forocoches uses session cookies to authenticate users. The module uses Puppeteer (headless Chrome) with your session cookies to access the forum.

## Instructions

### 1. Install the browser extension

Install "Get cookies.txt LOCALLY" extension for Chrome:
https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc

### 2. Export your Forocoches cookies

1. Open Chrome and go to https://forocoches.com
2. Make sure you are **logged in** to your Forocoches account
3. Click the "Get cookies.txt LOCALLY" extension icon in your toolbar
4. Click "Export" to download the cookies file
5. The file will be downloaded as `cookies.txt`

### 3. Move the cookies file

Move the downloaded `cookies.txt` file to the forocoches module directory:

```bash
mv ~/Downloads/cookies.txt src/modules/forocoches/cookies.txt
```

### 4. Save your User-Agent (optional but recommended)

The User-Agent must match the browser that exported the cookies. Run this in your Chrome console to get it:

```javascript
navigator.userAgent
```

Save it to a file:

```bash
echo 'YOUR_USER_AGENT_STRING' > src/modules/forocoches/user-agent.txt
```

If you skip this step, a default Chrome User-Agent is used, which may not match your browser.

### 5. Enable the module

Update `lo-claude.config.json` to include forocoches in enabled modules:

```json
{
  "enabledModules": ["gmail", "drive", "s3", "mediavida", "forocoches"]
}
```

### 6. Restart Claude Code

Restart Claude Code for the changes to take effect. The forocoches tools will now be available.

## Available Tools

After setup, you'll have access to these MCP tools:

- **forocoches_thread** - Get and summarize a full thread (fetches all pages)
  - Parameters: `url` (required), `maxPages` (optional, default: 10)

- **forocoches_page** - Get a single page of a thread
  - Parameters: `url` (required), `page` (optional, default: 1)

## Example Usage

Once configured, you can ask Claude things like:

- "Summarize this forocoches thread: https://forocoches.com/foro/showthread.php?t=123456"
- "Get page 2 of this thread: [url]"
- "What are the main topics discussed in this thread?"

## Troubleshooting

### Getting 403 errors

If you get 403 (Forbidden) errors, your cookies may have expired:

1. Go to forocoches.com in Chrome and make sure you're logged in
2. Re-export the cookies using the extension
3. Replace the `cookies.txt` file

### Cookies expire periodically

Session cookies expire periodically. If the module stops working after some time, simply re-export your cookies.

### User-Agent mismatch

The module uses a Chrome User-Agent. If you exported cookies from a different browser, you may get 403 errors. Always export from Chrome.

## Security Notes

- Never commit `cookies.txt` - it contains your session
- The file is in `.gitignore`
- Cookies are stored locally only
- The module only reads forum content (no posting capability)

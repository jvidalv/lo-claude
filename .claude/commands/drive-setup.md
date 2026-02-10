# Google Drive Module Setup

Set up the Google Drive module for Lo-Claude to organize receipt photos.

## Prerequisites
- Google account
- Gmail module already configured (credentials.json exists)
- iPhone with Google Drive app (for receipt photo workflow)

## Instructions

### 1. Enable the Drive API

If you've already set up the Gmail module, you have a Google Cloud project. Enable Drive API:

```bash
gcloud services enable drive.googleapis.com
```

### 2. Update OAuth Consent Screen Scopes

Go to the OAuth consent screen to add Drive scope:
https://console.cloud.google.com/apis/credentials/consent

1. Click "Edit App"
2. Go to "Scopes" section
3. Click "Add or Remove Scopes"
4. Add: `https://www.googleapis.com/auth/drive`
5. Save changes

### 3. Re-authorize with New Scopes

Delete the existing token to force re-authorization:

```bash
rm src/modules/google/token.json
```

Next time you use a Drive tool, you'll be prompted to authorize again. The new authorization will include the Drive scope.

### 4. Create Folder Structure in Google Drive

In your Google Drive, create the following folder structure:
- `Receipts/` (root folder for all receipts)
  - `Receipts/Inbox/` (where new receipt photos go)
  - `Receipts/Organized/` (where organized receipts are moved)

You can create these manually in Drive, or the module will create `Receipts/Organized` automatically when you organize receipts.

### 5. Set Up iOS Shortcut (iPhone)

Create an iOS Shortcut to upload photos to Drive:

1. **Install Google Drive app** on your iPhone if not already installed

2. **Create new Shortcut:**
   - Open Shortcuts app
   - Tap "+" to create new shortcut
   - Name it "Upload Receipt"

3. **Add actions:**
   - Action 1: "Get Images from Input" (to get the shared photo)
   - Action 2: "Save File"
     - Service: Google Drive
     - Destination Path: `Receipts/Inbox/`
     - Ask Where to Save: Off

4. **Enable Share Sheet:**
   - Tap the info icon (i) at the bottom
   - Enable "Show in Share Sheet"
   - Select "Images" for share sheet types

5. **Usage:**
   - Take a photo of a receipt
   - Tap Share > "Upload Receipt"
   - Done! Photo is now in Drive's Receipts/Inbox

### 6. Enable the Module

Update `lo-claude.config.json`:
```json
{
  "enabledModules": ["gmail", "drive", "mediavida"]
}
```

### 7. Restart MCP Server

Restart Claude Code or the MCP server to load the new module.

### 8. Test the Setup

Try these commands:
- "Show me my receipt photos" -> uses `drive_receipts`
- "List files in Receipts/Inbox" -> uses `drive_list`

## Workflow Example

1. Take photo of receipt at restaurant
2. Share photo > "Upload Receipt" (iOS Shortcut)
3. Later, ask Claude: "Show me my receipt photos"
4. Claude shows photos with suggested names
5. Tell Claude: "That first one is from Lateral, second is Goiko"
6. Claude renames and moves to Receipts/Organized:
   - `lateral-january-2025.jpg`
   - `goiko-january-2025.jpg`

## Available Tools

- `drive_list` - List files in a folder
- `drive_download` - Download file to local temp folder
- `drive_rename` - Rename a file
- `drive_move` - Move file to another folder
- `drive_receipts` - List receipt photos from Inbox with suggested names
- `drive_organize_receipts` - Rename and move multiple receipts at once

## Security Notes

- Drive module requires full drive access (`drive` scope) for rename/move operations
- This is more permissive than Gmail's read-only scope
- All credentials are stored locally only
- Never commit `credentials.json` or `token.json`

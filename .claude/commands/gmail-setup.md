# Gmail Module Setup

Set up the Gmail module for Lo-Claude.

## Prerequisites
- Google account
- Google Cloud CLI (gcloud) installed

## Instructions

### 1. Check/Install Google Cloud CLI

Check if gcloud is installed:
```bash
gcloud --version
```

If not installed, guide the user to install it from: https://cloud.google.com/sdk/docs/install

### 2. Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens a browser for the user to authenticate.

### 3. Create or Select a Google Cloud Project

List existing projects:
```bash
gcloud projects list
```

Create a new project using the user's computer hostname for uniqueness:
```bash
gcloud projects create lo-claude-$(hostname | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-20) --name="Lo-Claude"
```

Or manually specify a unique ID (must be lowercase, 6-30 chars, globally unique):
```bash
gcloud projects create lo-claude-myuniqueid --name="Lo-Claude"
```

Set the project (use the project ID from the previous step):
```bash
gcloud config set project lo-claude-YOURPROJECTID
```

### 4. Enable the Gmail API

```bash
gcloud services enable gmail.googleapis.com
```

### 5. Create OAuth Credentials

Get the project ID from the previous step, then use these direct links (replace `PROJECT_ID` with your actual project ID):

1. **Configure OAuth consent screen:**
   https://console.cloud.google.com/apis/credentials/consent?project=PROJECT_ID

   - User Type: External (or Internal if using Workspace)
   - App name: Lo-Claude
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `gmail.readonly` (or skip, can be requested at runtime)
   - **IMPORTANT: Publish the consent screen** - Click "Publish App" to move from testing to production, otherwise you'll get "Error 403: access_denied".

2. **Create OAuth client ID:**
   https://console.cloud.google.com/apis/credentials?project=PROJECT_ID

   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application** (not Desktop app)
   - Name: Lo-Claude
   - Under "Authorized JavaScript origins", add: `http://localhost`
   - Under "Authorized redirect URIs", add: `http://localhost`
   - Click "Create"

3. **Download credentials:**
   - Click the download icon next to your newly created OAuth client
   - Save the file as `credentials.json` in the project root

### 6. Run OAuth Flow

The first time you use the Gmail tools, you'll be prompted to authorize the app.
This will create a `token.json` file with your access tokens.

To test manually:
```bash
npm run dev
```

### 7. Verify Setup

Update `lo-claude.config.json` to include gmail in enabled modules:
```json
{
  "enabledModules": ["gmail"],
  "gmail": {
    "credentialsPath": "./credentials.json",
    "tokenPath": "./token.json"
  }
}
```

### Security Notes

- Never commit `credentials.json` or `token.json`
- Both files are in `.gitignore`
- The Gmail module only requests `gmail.readonly` scope by default
- Tokens are stored locally only

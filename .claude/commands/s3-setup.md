# AWS S3 Module Setup

Set up the S3 module for Lo-Claude to organize receipt photos in Amazon S3.

## Prerequisites
- AWS account
- AWS CLI installed and configured
- S3 bucket created (default: `josep-personal`)

## Instructions

### 1. Install AWS CLI (if not already installed)

Check if AWS CLI is installed:
```bash
aws --version
```

If not installed, install via Homebrew:
```bash
brew install awscli
```

### 2. Configure AWS Credentials

Configure your AWS credentials:
```bash
aws configure
```

This will prompt for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `eu-west-1`)
- Default output format (e.g., `json`)

Credentials are stored in `~/.aws/credentials`.

### 3. Create S3 Bucket Structure

Create the receipts folder structure in your bucket:

```bash
# Create inbox folder (upload destination)
aws s3api put-object --bucket josep-personal --key receipts/inbox/

# Create organized folder (where organized receipts go)
aws s3api put-object --bucket josep-personal --key receipts/organized/
```

### 4. Set Up iOS Shortcut (iPhone)

Create an iOS Shortcut to upload photos directly to S3:

**Option A: Using AWS S3 app**
1. Install "AWS S3 Manager" or similar app from App Store
2. Configure with your AWS credentials
3. Create shortcut to upload to `s3://josep-personal/receipts/inbox/`

**Option B: Using Shortcuts + AWS Lambda (advanced)**
1. Create an API Gateway + Lambda function that accepts image uploads
2. Lambda uploads to S3 bucket
3. Create iOS Shortcut that POSTs to the API endpoint

**Option C: Using iCloud + sync script**
1. Save photos to a specific iCloud folder
2. Run a script on your Mac that syncs to S3:
```bash
aws s3 sync ~/Library/Mobile\ Documents/com~apple~CloudDocs/Receipts/ s3://josep-personal/receipts/inbox/
```

### 5. Enable the Module

Update `lo-claude.config.json`:
```json
{
  "enabledModules": ["gmail", "drive", "s3", "mediavida"]
}
```

### 6. Set Environment Variables (Optional)

If not using `~/.aws/credentials`, set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=eu-west-1
```

### 7. Restart MCP Server

Restart Claude Code or the MCP server to load the new module.

### 8. Test the Setup

Try these commands:
- "Show my S3 receipt photos" -> uses `s3_receipts`
- "List files in receipts/inbox" -> uses `s3_list`

## Workflow Example

1. Take photo of receipt at restaurant
2. Upload to S3 via iOS Shortcut or sync
3. Later, ask Claude: "Show my S3 receipt photos"
4. Claude shows photos with suggested names
5. Tell Claude: "That first one is from Lateral, second is Goiko"
6. Claude renames and moves to organized folder:
   - `receipts/organized/lateral-january-2025.jpg`
   - `receipts/organized/goiko-january-2025.jpg`

## Available Tools

- `s3_list` - List objects in a bucket with optional prefix
- `s3_download` - Download object to local temp folder
- `s3_upload` - Upload local file to S3
- `s3_rename` - Rename an object (copy + delete)
- `s3_move` - Move object to different prefix
- `s3_receipts` - List receipt photos from inbox with suggested names
- `s3_organize_receipts` - Rename and move multiple receipts at once

## Default Configuration

- **Bucket**: `josep-personal`
- **Region**: `eu-west-1`
- **Inbox prefix**: `receipts/inbox/`
- **Organized prefix**: `receipts/organized/`

These defaults can be overridden in each tool call.

## Security Notes

- AWS credentials are stored in `~/.aws/credentials` (standard AWS location)
- Never commit AWS credentials to version control
- Consider using IAM roles with minimal permissions (S3 only)
- The module only accesses the specified bucket

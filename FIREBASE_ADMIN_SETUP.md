# Firebase Admin SDK Setup Guide

This guide explains how to set up Firebase Admin SDK credentials required for the database backup download feature.

## Why Firebase Admin SDK is Needed

The download backup feature requires **Firebase Admin SDK** to:
- Access Firestore database from the server (API routes)
- Read all collections and documents securely
- Generate backup data without browser limitations
- Work with any browser or device

## Steps to Configure

### 1. Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pgc-genomebase**
3. Click the ⚙️ (Settings) icon → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. A JSON file will be downloaded (keep this secure!)

### 2. Add Credentials to Environment Variables

Open your `.env.local` file and add these variables (they should NOT be committed to version control):

```bash
# Firebase Admin SDK (Server-side only - KEEP SECRET)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pgc-genomebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
```

**How to get these values from the downloaded JSON file:**

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "pgc-genomebase",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@pgc-genomebase.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

- **FIREBASE_CLIENT_EMAIL** = Copy the `client_email` value
- **FIREBASE_PRIVATE_KEY** = Copy the entire `private_key` value (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

**Important:** The private key contains `\n` characters. Keep them as-is and wrap the entire key in quotes.

Example:
```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@pgc-genomebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 3. Restart Development Server

After adding the environment variables:

```bash
npm run dev
```

The server will now initialize Firebase Admin SDK and the backup download feature will work.

## Vercel Deployment

When deploying to Vercel, add these environment variables:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `FIREBASE_CLIENT_EMAIL` = (paste the client email)
   - `FIREBASE_PRIVATE_KEY` = (paste the entire private key with quotes)
4. Redeploy your application

**Note:** In Vercel, you don't need to escape the `\n` characters - Vercel handles them automatically.

## Security Best Practices

1. ✅ **NEVER** commit `.env.local` to Git
2. ✅ Add `.env.local` to your `.gitignore` file (already done)
3. ✅ Keep the service account JSON file secure
4. ✅ Only share credentials through secure channels (password managers, encrypted files)
5. ✅ Rotate credentials if they are ever exposed
6. ✅ Use Vercel's environment variable encryption

## Troubleshooting

### Error: "Service account object must contain a string 'private_key' property"

**Cause:** The `FIREBASE_PRIVATE_KEY` is missing or incorrectly formatted.

**Solution:** 
- Ensure the key is wrapped in quotes
- Keep the `\n` characters
- Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Error: "The default Firebase app does not exist"

**Cause:** Firebase Admin SDK failed to initialize.

**Solution:**
- Check that all required environment variables are set
- Restart the development server after adding variables
- Verify the `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your project

### Build Error during `npm run build`

**Cause:** Environment variables are not loaded during build.

**Solution:** 
- Make sure `.env.local` exists in the project root
- Verify all required variables are present
- Try `npm run build` again after adding variables

## How the Download Feature Works

1. **User clicks "Download Backup"** in the admin panel
2. **Client makes API request** to `/api/admin/backup/download`
3. **Server uses Firebase Admin SDK** to read all Firestore data
4. **Server returns JSON** with all collections and documents
5. **Client receives data** and creates a downloadable file
6. **File System Access API** (Chrome/Edge) lets user choose save location
7. **Fallback download** for other browsers saves to Downloads folder

## Related Features

- **Server Backup** - Creates backups in the server's filesystem (Vercel)
- **Google Drive Backup** - Automatic incremental backups every Friday
- **Download Backup** - Manual download to any device (requires this setup)

## Next Steps

After setting up Firebase Admin SDK:

1. Test the download feature in the admin panel
2. Set up Google Drive automatic backups (optional) - see `GOOGLE_DRIVE_BACKUP_GUIDE.md`
3. Configure Vercel cron jobs for scheduled backups

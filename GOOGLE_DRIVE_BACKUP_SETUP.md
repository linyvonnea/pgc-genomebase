# Google Drive Automatic Backup Setup Guide

This guide will help you set up automatic incremental backups to Google Drive that run every Friday.

## Features

✅ **Incremental Backups**: Only backs up documents that changed since the last backup  
✅ **Automatic Schedule**: Runs every Friday at 6:00 PM (server time)  
✅ **Space Efficient**: Saves storage by only backing up changes  
✅ **Cloud Storage**: Secure backups stored in your Google Drive  
✅ **No Manual Intervention**: Fully automated once configured  

## Prerequisites

- Google Cloud Platform account
- Access to your Vercel project settings
- Superadmin access to the backup page

## Setup Steps

### 1. Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google Drive API"
   - Click **Enable**

4. Create a service account:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **Service Account**
   - Enter a name (e.g., "Firestore Backup Service")
   - Click **Create and Continue**
   - Skip role assignment (click **Continue**)
   - Click **Done**

5. Create a service account key:
   - Click on the service account you just created
   - Go to the **Keys** tab
   - Click **Add Key** > **Create New Key**
   - Select **JSON** format
   - Click **Create** (the key file will download)

### 2. Set Up Google Drive Folder

1. Open [Google Drive](https://drive.google.com/)
2. Create a new folder for backups (e.g., "Firestore Backups")
3. Right-click the folder > **Share**
4. Add the service account email (found in the JSON key file) with **Editor** permissions
5. Get the folder ID from the URL:
   - Open the folder
   - Copy the ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 3. Configure Environment Variables

Add these environment variables to your Vercel project:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add the following variables:

#### Required Variables:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
```
(Found in the JSON key file as `client_email`)

```bash
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
```
(Found in the JSON key file as `private_key` - copy the entire value including `-----BEGIN` and `-----END`)

#### Optional Variables:

```bash
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your_folder_id_here
```
(The folder ID from step 2.5 - if not provided, backups will be stored in the root of the service account's drive)

```bash
CRON_SECRET=your_random_secret_string
```
(A random string for securing the cron endpoint - generate one using `openssl rand -base64 32`)

### 4. Deploy Configuration

The project includes a `vercel.json` file with the cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/admin/backup/scheduled",
      "schedule": "0 18 * * 5"
    }
  ]
}
```

This runs every Friday at 6:00 PM (18:00) server time.

**To change the schedule**, modify the cron expression:
- `0 18 * * 5` = 6:00 PM every Friday
- `0 12 * * 5` = 12:00 PM every Friday
- `0 0 * * 1` = Midnight every Monday
- `0 0 * * *` = Midnight every day

### 5. Deploy and Test

1. Commit and push your changes:
```bash
git add .
git commit -m "Add Google Drive automatic backup"
git push
```

2. Vercel will automatically deploy with the cron job

3. Check the backup status:
   - Go to `/admin/backup` in your application
   - Look for the "Google Drive Automatic Backup" section
   - Status should show "Configured" if set up correctly

4. Test the backup manually (optional):
```bash
curl -X POST https://your-domain.vercel.app/api/admin/backup/scheduled \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

### Incremental Backup Logic

The system tracks which documents have changed using the `updatedAt` timestamp field:

1. **First Backup**: Backs up all documents (full backup)
2. **Subsequent Backups**: Only backs up documents where `updatedAt > lastBackupDate`
3. **Metadata Storage**: Backup metadata is stored in Firestore at `systemSettings/backupMetadata`

### What Gets Backed Up

The following collections are included in automatic backups:
- admins
- chargeSlips
- clients
- inquiries
- projects
- quotations
- roles
- services
- catalogSettings
- activityLogs

Plus all subcollections under these collections.

### Backup File Format

Each backup creates a JSON file in Google Drive with this structure:

```json
{
  "metadata": {
    "timestamp": "2026-02-02T15:30:00.000Z",
    "lastBackupDate": "2026-02-02T15:30:00.000Z",
    "collections": ["admins", "clients", ...],
    "totalDocuments": 1697,
    "isIncremental": true,
    "changedDocuments": 45
  },
  "timestamp": "2026-02-02T15:30:00.000Z",
  "collections": ["admins", "clients", ...]
}
```

## Monitoring and Logs

### Check Backup Status

Visit `/admin/backup` to see:
- Last backup date and time
- Number of documents changed
- Configuration status
- Next scheduled backup day

### Vercel Logs

1. Go to your Vercel project
2. Click on the deployment
3. Go to **Logs** tab
4. Filter by `/api/admin/backup/scheduled` to see backup logs

### Success Indicators

- 🚀 "Starting incremental backup to Google Drive..."
- 📊 "Incremental backup found X changed documents"
- ✅ "Backup uploaded to Google Drive"

### Common Log Messages

- **"Not a backup day"**: The cron ran but it's not Friday
- **"No changes detected"**: No documents were modified since last backup
- **"Google Drive not configured"**: Missing environment variables

## Troubleshooting

### Issue: "Google Drive not configured"

**Solution**: Verify all environment variables are set in Vercel:
- Check variable names match exactly
- Ensure `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` includes the full key with `\n` characters
- Redeploy after adding variables

### Issue: "Permission denied" when uploading to Google Drive

**Solution**: 
- Verify the service account email has Editor access to the Google Drive folder
- Check that the folder ID is correct
- Ensure Google Drive API is enabled in Google Cloud Console

### Issue: Backups not running on schedule

**Solution**:
- Verify `vercel.json` is in the project root
- Check that the cron job is visible in Vercel project settings
- Ensure the project is on a paid Vercel plan (crons require Hobby or Pro)
- Check Vercel logs for any errors

### Issue: "updatedAt field not found"

**Solution**: 
- Ensure your Firestore documents have an `updatedAt` timestamp field
- Update your document write operations to include:
  ```javascript
  updatedAt: serverTimestamp()
  ```
- For existing documents without `updatedAt`, the backup will perform a full backup

## Security Best Practices

1. **Rotate Service Account Keys**: Regularly rotate your service account keys
2. **Use CRON_SECRET**: Always set a strong `CRON_SECRET` to prevent unauthorized backup triggers
3. **Limit Service Account Permissions**: The service account should only have access to the backup folder
4. **Monitor Backup Logs**: Regularly check Vercel logs for any suspicious activity
5. **Encrypt Sensitive Data**: Consider encrypting backup files before uploading

## Maintenance

### Cleanup Old Backups

To prevent excessive storage use, periodically clean up old backups:

1. Manually delete old backup files from Google Drive
2. Keep at least 4-8 weeks of backups for safety
3. Consider implementing automated cleanup (future enhancement)

### Update Collections

If you add new collections to your database:

1. Edit `/src/app/api/admin/backup/scheduled/route.ts`
2. Add the collection name to the `COLLECTIONS` array
3. Commit and deploy

## Cost Considerations

### Google Drive Storage

- Free tier: 15 GB
- Incremental backups minimize storage use
- Example: 1,697 documents (~5-10 MB per backup)
- Estimate: 50-100 backups possible in free tier

### Vercel Cron Jobs

- Requires Hobby plan ($20/month) or higher
- Includes 100 hours of serverless function execution
- Backup typically runs in < 1 minute

## Native Directory Picker

The backup page now supports native directory selection:

### Browser Support

- ✅ **Chrome/Edge**: Full support for `showDirectoryPicker()`
- ✅ **Opera**: Full support
- ⚠️ **Firefox**: Limited support
- ⚠️ **Safari**: Not supported yet

### Fallback

For unsupported browsers, users can manually enter the directory path.

## Next Steps

1. Complete the Google Cloud setup
2. Add environment variables to Vercel
3. Deploy the changes
4. Verify configuration in `/admin/backup`
5. Wait for Friday or trigger a manual test
6. Monitor the first automatic backup

## Support

For issues or questions:
- Check Vercel deployment logs
- Review Google Cloud Console for API errors
- Verify all environment variables are correctly set
- Test with manual backup trigger before waiting for scheduled run

---

**Last Updated**: February 2, 2026  
**Version**: 1.0

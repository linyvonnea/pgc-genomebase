# Firestore Database Backups

This directory contains timestamped backups of your Firestore database.

## 📁 Backup Structure

Each backup folder contains:
- **`{collection}.json`** - JSON files for each collection
- **`subcollections/`** - Nested directory structure for subcollections
- **`backup-metadata.json`** - Backup information (timestamp, document count, collections)

## 🔄 Creating a Backup

### Via Web Interface
1. Navigate to `/admin/backup` in your application
2. Click the "Create Backup" button
3. Wait for the backup to complete (progress bar will show status)
4. Your backup will appear in the backups list

### Via Command Line
```bash
# Run backup script directly
node scripts/firestore-backup.js

# Or use npm script
npm run backup
```

## 🔧 Restoring a Backup

### Via Web Interface
1. Navigate to `/admin/backup` in your application
2. Find the backup you want to restore
3. Click the "Restore" button
4. Confirm the restoration
5. Wait for the process to complete

### Via Command Line
```bash
node scripts/firestore-restore.js
```
The script will:
1. Show you a list of available backups
2. Let you select which backup to restore
3. Ask for confirmation (type "yes")
4. Restore all collections and subcollections

## 📊 What Gets Backed Up

The backup system automatically discovers and backs up:
- **All root-level collections** in your Firestore database
- **All subcollections** under the `clients` collection (projects and inquiries)
- **Complete document data** with all fields and nested objects
- **Document IDs** to maintain references

Currently backing up these collections:
- activityLogs
- admins
- chargeSlips
- chargeSlips_3
- client_projects
- clients (including subcollections)
- clients_backup
- inquiries
- mail
- projects
- projects_backup
- quotations
- rolePermissions
- services
- settings
- templates
- trainings
- users

## ⚠️ Important Notes

### Before Restoring
- **Restoration will overwrite existing data** in your database
- Always confirm you're restoring the correct backup
- Consider creating a new backup before restoring an old one
- Test restoration in a development environment first

### Backup Frequency
- Create backups before major changes
- Schedule regular automated backups
- Keep multiple backup versions for safety

### Storage
- Backups are stored locally in the `/backups` directory
- Each backup is timestamped for easy identification
- Consider backing up this directory to cloud storage

## 🛡️ Data Safety

### What the Backup Includes
✅ All document data and fields
✅ Document IDs (maintains relationships)
✅ Nested objects and arrays
✅ Subcollections
✅ Timestamps and metadata

### What Gets Restored
The restore process:
- Uses `merge: true` to avoid overwriting unchanged fields
- Restores documents in batches of 500 (Firestore limit)
- Maintains original document IDs
- Restores subcollections to their proper locations

## 📝 Backup Metadata Example

Each backup includes a `backup-metadata.json` file:
```json
{
  "timestamp": "2026-02-02T11:43:55.769Z",
  "totalDocuments": 2337,
  "collections": ["activityLogs", "admins", "clients", ...],
  "backupDuration": 77792,
  "version": "1.0.0"
}
```

## 🚨 Troubleshooting

### Backup Fails
- Check Firebase Admin credentials in `scripts/serviceAccountKey.json`
- Ensure you have read permissions for all collections
- Check disk space for backup storage

### Restore Fails
- Verify the backup folder structure is intact
- Check Firebase Admin credentials and write permissions
- Ensure Firestore rules allow writes for your service account

## 🔐 Security

- **Service Account Key**: Keep `serviceAccountKey.json` secure
- **Backup Files**: Contain sensitive data - protect accordingly
- **Access Control**: Limit who can create/restore backups
- **Encryption**: Consider encrypting backup files at rest

## 📞 Support

For issues or questions:
1. Check the terminal output for error messages
2. Review Firestore console for permission issues
3. Verify service account credentials are valid

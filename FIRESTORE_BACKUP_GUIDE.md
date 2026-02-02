# Firestore Backup & Restore Guide

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
npm install firebase-admin --save-dev
```

### 2. Download Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate new private key**
5. Save the JSON file as `scripts/serviceAccountKey.json`

### 3. Update Collection Names
Edit the `collections` array in both backup and restore scripts to match your actual Firestore collections.

## 📦 Backup Your Firestore

### Manual Backup
```bash
node scripts/firestore-backup.js
```

### Automated Daily Backup (Windows)
Create a scheduled task or use the batch file:
```batch
# backup-daily.bat
@echo off
cd /d "C:\Users\PGCV\Documents\pgc-genomebase"
node scripts/firestore-backup.js
echo Backup completed at %date% %time%
```

## 🔄 Restore Your Firestore

### Interactive Restore
```bash
node scripts/firestore-restore.js
```
- Shows list of available backups
- Interactive selection
- Confirmation prompts for safety

## 📁 Backup Structure

```
backups/
├── firestore-backup-2026-02-02T10-30-00-000Z/
│   ├── backup-metadata.json          # Backup info
│   ├── admins.json                    # Collection data
│   ├── chargeSlips.json
│   ├── clients.json
│   ├── inquiries.json
│   ├── projects.json
│   ├── quotations.json
│   ├── roles.json
│   ├── services.json
│   ├── catalogSettings.json
│   ├── activityLogs.json
│   └── subcollections/               # Nested collections
│       └── clients/
│           └── [clientId]/
│               ├── projects.json
│               └── inquiries.json
```

## 🛡️ Best Practices

### 1. Regular Backups
- **Daily**: Automated backup during off-peak hours
- **Before deployments**: Manual backup before major changes
- **Before imports**: Backup before bulk data operations

### 2. Backup Retention
```bash
# Clean old backups (keep last 7 days)
node scripts/cleanup-old-backups.js
```

### 3. Test Restores
- Periodically test restore process on development environment
- Verify data integrity after restore

### 4. Multiple Backup Locations
- Local laptop backups (current setup)
- Cloud storage backups (Google Drive, Dropbox)
- External drive backups

## 📅 Scheduled Backup Setup

### Windows Task Scheduler
1. Open **Task Scheduler**
2. Create Basic Task
3. **Trigger**: Daily at 2:00 AM
4. **Action**: Start a program
5. **Program**: `node`
6. **Arguments**: `scripts/firestore-backup.js`
7. **Start in**: `C:\Users\PGCV\Documents\pgc-genomebase`

### Alternative: Node.js Cron Job
```javascript
const cron = require('node-cron');

// Run backup daily at 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('Starting automated backup...');
  require('./firestore-backup.js');
});
```

## 🚨 Emergency Procedures

### Quick Restore Commands
```bash
# Latest backup
node scripts/firestore-restore.js

# Specific collection only
node scripts/restore-collection.js chargeSlips

# Verify backup integrity
node scripts/verify-backup.js
```

## ⚙️ Configuration Options

### Environment Variables
```bash
# .env.backup
FIREBASE_PROJECT_ID=your-project-id
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=true
```

### Collection-Specific Backups
```javascript
// Backup only specific collections
const criticalCollections = ['chargeSlips', 'quotations', 'clients'];
```

## 📊 Monitoring & Alerts

### Backup Success Monitoring
```javascript
// Send email notification on backup completion
const nodemailer = require('nodemailer');

async function sendBackupNotification(status, details) {
  // Email notification code
}
```

## 🔐 Security Considerations

1. **Service Account Key**: Store securely, don't commit to Git
2. **Backup Encryption**: Encrypt sensitive backup files
3. **Access Control**: Limit who can run restore operations
4. **Audit Logging**: Log all backup/restore operations

## 🛠️ Troubleshooting

### Common Issues

**Permission Denied**
```bash
# Fix: Check service account permissions
Firebase Console > IAM & Admin > Service Accounts
Required roles: Firebase Admin SDK Administrator Service Agent
```

**Large Collections**
```javascript
// Use streaming for large datasets
const stream = db.collection('largeCollection').stream();
```

**Network Timeouts**
```javascript
// Increase timeout for large backups
const options = { timeout: 300000 }; // 5 minutes
```

## 📈 Backup Verification

### Data Integrity Check
```bash
node scripts/verify-backup-integrity.js backup-folder-name
```

### Compare Collections
```bash
node scripts/compare-collections.js sourceBackup targetBackup
```
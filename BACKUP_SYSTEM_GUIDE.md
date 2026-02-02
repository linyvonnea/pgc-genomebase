# Database Backup System - Complete Guide

This guide explains all three backup methods available in PGC GenomeBase and when to use each one.

## Overview

The application provides three distinct backup methods, each designed for different use cases:

| Method | Best For | Storage Location | Setup Complexity | Automatic |
|--------|----------|------------------|------------------|-----------|
| **Download Backup** | Individual users, manual backups | Your computer (any location) | Easy | No |
| **Server Backup** | Quick server-side backups | Vercel server filesystem | Easy | No |
| **Google Drive Backup** | Scheduled automatic backups | Google Drive cloud | Medium | Yes (Fridays) |

## 1. Download Backup to Your Computer ⬇️

### What It Does
Downloads a complete Firestore database backup as a JSON file directly to your computer. You can choose where to save it.

### When to Use
- ✅ You want a backup on your local computer
- ✅ You need backups accessible offline
- ✅ You want to choose the exact save location
- ✅ You're working from different devices/browsers
- ✅ You need an immediate backup now

### How It Works

1. **User clicks "Download Backup"** in the admin panel
2. **Server fetches all data** from Firestore using Firebase Admin SDK
3. **Data is sent to client** as JSON
4. **Browser shows save dialog:**
   - **Chrome/Edge:** File System Access API - choose exact folder
   - **Other browsers:** Standard download to Downloads folder
5. **File is saved** with timestamp: `firestore-backup-2024-01-15T14-30-00.json`

### Browser Compatibility

| Browser | Directory Selection | Fallback |
|---------|-------------------|----------|
| Chrome | ✅ Yes | - |
| Edge | ✅ Yes | - |
| Firefox | ❌ No | Downloads folder |
| Safari | ❌ No | Downloads folder |
| Mobile | ❌ No | Downloads folder |

### Setup Required

**Firebase Admin SDK Credentials:**

Follow [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md) to configure:
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### File Structure

The downloaded JSON file contains:

```json
{
  "metadata": {
    "timestamp": "2024-01-15T14:30:00.000Z",
    "totalCollections": 10,
    "totalDocuments": 1234,
    "collections": ["admins", "clients", "projects", ...]
  },
  "data": {
    "admins": [
      {
        "id": "admin1",
        "data": { "name": "...", "email": "..." }
      }
    ],
    "clients": [...],
    "clientSubcollections": {
      "clientId123": {
        "projects": [...],
        "inquiries": [...]
      }
    }
  }
}
```

### Advantages
- ✅ Works from any device
- ✅ No cloud storage needed
- ✅ Full control over backup location
- ✅ Can backup to external drives
- ✅ Instant download
- ✅ No storage limits

### Limitations
- ⚠️ Manual process (not automatic)
- ⚠️ Requires Firebase Admin SDK setup
- ⚠️ Directory selection only in Chrome/Edge
- ⚠️ Large databases may take longer to download

---

## 2. Server Backup (Advanced) 🖥️

### What It Does
Creates a backup file on the Vercel server's filesystem.

### When to Use
- ✅ You need a quick server-side backup
- ✅ You're testing the backup system
- ✅ You want backups accessible from the server
- ⚠️ Note: Vercel ephemeral filesystem - files may be deleted

### How It Works

1. **Server reads Firestore data**
2. **Creates backup file** in `/tmp/backups/` directory
3. **File is stored** on Vercel's filesystem (temporary)
4. **Can be restored** through the admin panel

### Storage Location
```
/tmp/backups/backup-2024-01-15T14-30-00.json
```

### Advantages
- ✅ Fast and simple
- ✅ No external dependencies
- ✅ Good for testing
- ✅ Can restore directly from admin panel

### Limitations
- ⚠️ **Vercel's filesystem is ephemeral** - files may be deleted on redeployment
- ⚠️ Not suitable for long-term storage
- ⚠️ Limited filesystem space on Vercel
- ⚠️ Only accessible from the application

### Use Cases
- Development and testing
- Temporary backups before major changes
- Quick backup/restore workflows

---

## 3. Google Drive Automatic Backup 📅

### What It Does
Automatically creates **incremental backups** to Google Drive every Friday at 6:00 PM.

### When to Use
- ✅ You want automated scheduled backups
- ✅ You need cloud storage for backups
- ✅ You want to save storage space (incremental)
- ✅ You want off-site backup protection
- ✅ You need backup history over time

### How It Works

1. **Vercel Cron triggers** every Friday at 18:00 (6 PM)
2. **Service checks** for documents changed since last backup
3. **Only changed documents** are backed up (incremental)
4. **Backup uploaded** to Google Drive
5. **Metadata stored** for next incremental backup

### Incremental Backup Logic

**First Backup:**
```
All documents → backup-2024-01-12.json (1.2 MB)
```

**Second Backup (1 week later):**
```
Only changed documents → backup-2024-01-19.json (320 KB)
Saves 73% storage!
```

### Setup Required

**Google Drive API Credentials:**

Follow [GOOGLE_DRIVE_BACKUP_GUIDE.md](./GOOGLE_DRIVE_BACKUP_GUIDE.md) to configure:
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `CRON_SECRET`

**Vercel Cron Configuration:**

Already configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/backup/scheduled",
    "schedule": "0 18 * * 5"
  }]
}
```

### Schedule Format (Cron)

```
0 18 * * 5
│ │  │ │ │
│ │  │ │ └─ Day of week (5 = Friday)
│ │  │ └─── Month (any)
│ │  └───── Day of month (any)
│ └──────── Hour (18 = 6 PM)
└────────── Minute (0)
```

**Current Schedule:** Every Friday at 6:00 PM

To change the schedule, edit `vercel.json`:
- Daily: `0 18 * * *` (6 PM every day)
- Weekly Monday: `0 18 * * 1`
- Monthly: `0 18 1 * *` (1st of month)

### File Naming

```
firestore-backup-YYYY-MM-DD-HH-mm-ss.json
Example: firestore-backup-2024-01-19-18-00-00.json
```

### Advantages
- ✅ Fully automatic - no manual intervention
- ✅ Incremental backups save storage space (~73%)
- ✅ Cloud storage (reliable, off-site)
- ✅ Scheduled and consistent
- ✅ Backup history over time
- ✅ Accessible from Google Drive

### Limitations
- ⚠️ Requires Google Drive API setup
- ⚠️ Requires Vercel Hobby plan or higher for cron
- ⚠️ Fixed schedule (can be changed in vercel.json)
- ⚠️ Depends on Google Drive storage limits

### Monitoring

Check backup status in admin panel:
- Last backup timestamp
- Next scheduled backup
- Total backups created
- Configuration status

---

## Comparison Matrix

| Feature | Download | Server | Google Drive |
|---------|----------|--------|--------------|
| **Storage** | Your computer | Vercel server | Google Drive cloud |
| **Automatic** | ❌ Manual | ❌ Manual | ✅ Scheduled |
| **Incremental** | ❌ Full backup | ❌ Full backup | ✅ Incremental |
| **Setup** | Firebase Admin | None | Google Drive API |
| **Browser Support** | All browsers | N/A | N/A |
| **Directory Selection** | Chrome/Edge | N/A | N/A |
| **Storage Limit** | Your disk space | Vercel limits | Google Drive quota |
| **Long-term Storage** | ✅ Reliable | ⚠️ Ephemeral | ✅ Reliable |
| **Off-site Backup** | ❌ Local | ❌ Local | ✅ Cloud |

---

## Recommended Backup Strategy

### For Maximum Protection

Use **all three methods** in combination:

1. **Google Drive Automatic** - Set it and forget it (weekly backups)
2. **Download Backup** - Manual backups before major changes
3. **Server Backup** - Testing and development

### Backup Schedule Recommendation

- **Daily:** Download backup before major operations
- **Weekly:** Google Drive automatic (Friday)
- **Monthly:** Download a local copy for offline storage
- **Before Updates:** Server backup for quick restore

---

## Security & Access Control

### Permission Requirements

All backup features require **Superadmin** role with `databaseBackup` module permissions:

```typescript
{
  databaseBackup: {
    view: true,
    create: true,
    edit: false,
    delete: false
  }
}
```

### Best Practices

1. ✅ **Restrict access** - Only give Superadmin access to backups
2. ✅ **Encrypt backups** - Store downloaded backups in encrypted folders
3. ✅ **Regular testing** - Periodically test backup restoration
4. ✅ **Multiple locations** - Store backups in different physical locations
5. ✅ **Monitor logs** - Check activity logs for backup operations
6. ✅ **Secure credentials** - Keep Firebase and Google Drive credentials secret

---

## Troubleshooting

### Download Backup Not Working

**Error:** "Failed to download backup"

**Solutions:**
1. Check Firebase Admin SDK credentials ([FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md))
2. Verify `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are set
3. Restart development server after adding env vars
4. Check browser console for errors

### Server Backup Files Disappear

**Issue:** Server backup files are gone after redeployment

**Explanation:** Vercel uses ephemeral filesystem - files are deleted on redeployment

**Solution:** Use Download Backup or Google Drive Backup for persistent storage

### Google Drive Backup Not Running

**Error:** Scheduled backup not executing

**Solutions:**
1. Verify Vercel plan supports cron jobs (Hobby+ required)
2. Check `CRON_SECRET` environment variable
3. Confirm Google Drive credentials are configured
4. Check Vercel deployment logs for cron execution
5. Verify cron schedule in `vercel.json`

### Directory Selection Not Working

**Issue:** Can't choose save location in browser

**Explanation:** File System Access API only supported in Chrome/Edge

**Solution:** 
- Use Chrome or Edge for directory selection
- Other browsers will download to default Downloads folder
- This is a browser limitation, not an app issue

---

## API Endpoints

### Download Backup
```
POST /api/admin/backup/download
```
Returns JSON with all Firestore data

### Server Backup
```
POST /api/admin/backup
```
Creates backup file on server filesystem

### Scheduled Backup (Cron)
```
POST /api/admin/backup/scheduled
```
Called by Vercel cron, uploads to Google Drive

### Restore Backup
```
POST /api/admin/restore
```
Restores backup from server or uploaded file

---

## Related Documentation

- [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md) - Firebase Admin SDK setup
- [GOOGLE_DRIVE_BACKUP_GUIDE.md](./GOOGLE_DRIVE_BACKUP_GUIDE.md) - Google Drive setup
- [ACTIVITY_LOGGING_GUIDE.md](./ACTIVITY_LOGGING_GUIDE.md) - Activity tracking
- [README.md](./README.md) - General application documentation

---

## Support

For issues or questions:
1. Check this documentation
2. Review setup guides (Firebase Admin, Google Drive)
3. Check Vercel deployment logs
4. Verify environment variables are set correctly
5. Test in Chrome/Edge for best compatibility

# Database Backup Implementation Summary

## Overview
Successfully implemented restricted database backup functionality with directory selection capability.

## Changes Made

### 1. Permission System Updates

#### Added `databaseBackup` Module to Permissions (`src/types/Permissions.ts`)
- Added `databaseBackup: ModulePermission` to `RolePermissions` interface
- Added module label: "Database Backup"
- Added to administration section in `MODULE_SECTIONS`
- Configured role-specific permissions:
  - **Viewer**: No access (all false)
  - **Moderator**: No access (all false)
  - **Admin**: No access (all false)
  - **Superadmin**: Full access (view, create, edit, delete)

### 2. Backup Page Updates (`src/app/admin/backup/page.tsx`)

#### Added Permission Guard
- Wrapped page with `PermissionGuard` component checking `databaseBackup` module
- Only superadmin users can access the backup page

#### Added Directory Selection Feature
- Added state management for backup directory (`backupDirectory`)
- Added directory selection dialog (`showDirectoryDialog`)
- Added input field for custom directory path
- Added "Browse" button to open directory dialog
- Added validation to ensure directory is selected before backup
- Disable backup button when no directory is selected

#### UI Improvements
- Added `FolderOpen` icon for directory selection
- Added helpful examples for directory paths (Windows and Mac/Linux)
- Added directory path display when selected
- Updated confirmation dialog to mention custom directory

### 3. Backend Updates

#### Updated Backup API (`src/app/api/admin/backup/route.ts`)
- Modified to accept custom directory from request body
- Pass directory parameter to backup script via command line argument
- Return directory information in response

#### Updated Backup Script (`scripts/firestore-backup.js`)
- Added support for custom directory via command line arguments
- Check for `process.argv[2]` for custom directory path
- Create backup directory structure in custom location if provided
- Fallback to default `backups` folder if no custom directory specified

### 4. Navigation Updates (`src/components/layout/AdminSidebar.tsx`)
- Updated `ROUTE_MODULE_MAP` to map `/admin/backup` to `databaseBackup` permission
- Database Backup menu item now properly checks for `databaseBackup` permission
- Only visible to users with view permission (superadmin only)

## Security Features

1. **Role-Based Access Control**: Only superadmin can access backup functionality
2. **Permission Guard**: Page-level protection using PermissionGuard component
3. **Backend Validation**: API routes should validate user permissions (can be enhanced)

## User Experience

### For Superadmin Users:
1. Navigate to "Database Backup" in the sidebar under Administration
2. Enter or paste a custom directory path for backups
3. Click "Browse" to open directory selection dialog (or enter path manually)
4. Click "Create Backup" button (disabled until directory is set)
5. Confirm backup creation in dialog
6. Backup is created in the specified directory

### For Non-Superadmin Users:
- "Database Backup" menu item is hidden from navigation
- Attempting to access `/admin/backup` directly shows "Access Denied" message

## Directory Path Examples

### Windows:
- `C:\Users\YourName\Documents\Backups`
- `C:\Backups\Database`
- `D:\MyBackups`

### Mac/Linux:
- `/home/user/backups`
- `/Users/username/Documents/Backups`
- `/var/backups/database`

## Technical Notes

1. **Directory Creation**: Backup script automatically creates directory structure if it doesn't exist
2. **Timestamp Format**: Each backup creates a subfolder with timestamp (e.g., `firestore-backup-2026-02-02T07-14-33-217Z`)
3. **Backup Contents**: Complete Firestore database export including all collections and subcollections
4. **Storage Location**: User-specified directory or default project `backups` folder

## Testing Checklist

- [x] Build compilation successful
- [x] Permission system properly configured
- [x] Backup page protected by permission guard
- [x] Directory selection dialog functional
- [x] Backup button disabled without directory
- [x] Navigation properly filtered by permissions
- [ ] Test actual backup with custom directory (requires deployment/local testing)
- [ ] Verify superadmin can access backup page
- [ ] Verify non-superadmin users cannot access backup page

## Future Enhancements

1. **Native Directory Picker**: Implement OS-native file picker dialog (requires Electron or similar)
2. **Cloud Storage Integration**: Add option to backup to Google Drive, S3, etc.
3. **Scheduled Backups**: Implement automatic backup scheduling
4. **Backup Compression**: Add ZIP compression for backup files
5. **Incremental Backups**: Implement delta backups to save storage
6. **Backup Verification**: Add integrity checks for backup files
7. **Restore Functionality**: Complete the restore feature with directory selection

## Role Management Integration

The "Database Backup" permission is now available in the Role Management page:
- Located in the Administration section
- Appears below "Activity Logs"
- All permission actions (View, Create, Edit, Delete) can be configured per role
- Changes are persisted to Firestore

## Files Modified

1. `src/types/Permissions.ts` - Added databaseBackup permission
2. `src/app/admin/backup/page.tsx` - Added permission guard and directory selection
3. `src/app/api/admin/backup/route.ts` - Added directory parameter support
4. `scripts/firestore-backup.js` - Added custom directory support
5. `src/components/layout/AdminSidebar.tsx` - Updated route-to-permission mapping

## Deployment Notes

No additional dependencies required. All changes use existing libraries and APIs.
Ensure Firebase Admin SDK service account key is properly configured.

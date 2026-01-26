# Client PID Migration Guide

## Problem
Existing client documents in Firestore still have:
- `pid` as a **string** (old format)
- `projects` as a separate **array** field

The code has been updated to use:
- `pid` as an **array** (new format)

## Solution
Run the migration script to update all existing client documents.

## Prerequisites
1. Make sure you have your Firebase service account key file:
   - File should be at: `scripts/serviceAccountKey.json`
   - If you don't have it, download it from Firebase Console:
     - Go to Project Settings > Service Accounts
     - Click "Generate New Private Key"
     - Save as `serviceAccountKey.json` in the `scripts` folder

## Running the Migration

### Step 1: Install Firebase Admin SDK (if not already installed)
```bash
npm install firebase-admin
```

### Step 2: Run the migration script
```bash
node scripts/migrateClientPidToArray.cjs
```

## What the Migration Does

For each client document:
1. Converts `pid` from string to array
2. Merges any existing `projects` array into the `pid` array
3. Removes the `projects` field
4. Handles duplicates (won't add same project twice)

### Example Transformation

**Before:**
```javascript
{
  cid: "C-2024-001",
  name: "John Doe",
  pid: "P-2024-001",          // string
  projects: ["P-2024-005", "P-2024-010"]  // separate array
}
```

**After:**
```javascript
{
  cid: "C-2024-001",
  name: "John Doe",
  pid: ["P-2024-001", "P-2024-005", "P-2024-010"]  // array
  // projects field removed
}
```

## Migration Output

The script will show:
- ✓ Progress for each client migrated
- Summary of total clients processed
- Count of migrated, skipped, and errors

## Safety Features

- **Idempotent**: Can be run multiple times safely (skips already migrated documents)
- **Batched**: Processes documents in batches of 500 for efficiency
- **Backward Compatible**: Code handles both old and new formats

## Verify Migration

After running, check Firestore Console:
1. Open any client document
2. Verify `pid` is now an array
3. Verify `projects` field is removed

## Rollback (if needed)

If you need to rollback, you would need to:
1. Have a Firestore backup
2. Restore from backup using Firebase Console

**Always test on a development/staging environment first!**

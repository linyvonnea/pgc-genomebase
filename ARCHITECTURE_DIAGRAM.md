# Download Backup System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP SYSTEM ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser    │         │   Vercel     │         │   Firebase   │
│   (Client)   │         │  (Server)    │         │  Firestore   │
└──────────────┘         └──────────────┘         └──────────────┘
```

## Detailed Flow Diagram

```
USER ACTION                  CLIENT                  SERVER                   FIREBASE
     │                          │                        │                        │
     │  1. Click "Download"     │                        │                        │
     ├─────────────────────────>│                        │                        │
     │                          │                        │                        │
     │                          │  2. POST /api/admin/   │                        │
     │                          │     backup/download    │                        │
     │                          ├───────────────────────>│                        │
     │                          │                        │                        │
     │                          │                        │  3. Initialize         │
     │                          │                        │     Firebase Admin     │
     │                          │                        ├───────────────────────>│
     │                          │                        │                        │
     │                          │                        │  4. Fetch collections  │
     │                          │                        ├───────────────────────>│
     │                          │                        │                        │
     │                          │                        │  5. Return documents   │
     │                          │                        │<───────────────────────┤
     │                          │                        │                        │
     │                          │  6. Return JSON        │                        │
     │                          │     with all data      │                        │
     │                          │<───────────────────────┤                        │
     │                          │                        │                        │
     │                          │  7. Create Blob        │                        │
     │                          │     from JSON          │                        │
     │                          │                        │                        │
     │  8. Show save dialog     │                        │                        │
     │     (Chrome/Edge)        │                        │                        │
     │<─────────────────────────┤                        │                        │
     │                          │                        │                        │
     │  9. Choose location      │                        │                        │
     ├─────────────────────────>│                        │                        │
     │                          │                        │                        │
     │                          │  10. Save file         │                        │
     │                          │      to disk           │                        │
     │                          │                        │                        │
     │  11. Done! ✅            │                        │                        │
     │<─────────────────────────┤                        │                        │
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /app/admin/backup/page.tsx                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  BackupPageContent Component                             │    │   │
│  │  │  ├─ State Management                                     │    │   │
│  │  │  │  ├─ isDownloading                                     │    │   │
│  │  │  │  ├─ backupProgress                                    │    │   │
│  │  │  │  └─ toast notifications                               │    │   │
│  │  │  │                                                        │    │   │
│  │  │  ├─ handleDownloadBackup()                               │    │   │
│  │  │  │  ├─ Fetch data from API                               │    │   │
│  │  │  │  ├─ Create Blob                                       │    │   │
│  │  │  │  ├─ Try File System Access API (Chrome/Edge)          │    │   │
│  │  │  │  └─ Fallback to standard download (others)            │    │   │
│  │  │  │                                                        │    │   │
│  │  │  └─ UI Components                                        │    │   │
│  │  │     ├─ Download button                                   │    │   │
│  │  │     ├─ Progress bar                                      │    │   │
│  │  │     └─ Info cards                                        │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  components/PermissionGuard.tsx                                  │   │
│  │  └─ Enforces databaseBackup permissions                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Next.js API)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /app/api/admin/backup/download/route.ts                         │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  POST Handler                                            │    │   │
│  │  │  ├─ Import Firebase Admin SDK                           │    │   │
│  │  │  ├─ Initialize metadata                                 │    │   │
│  │  │  ├─ Loop through collections                            │    │   │
│  │  │  │  └─ For each collection:                             │    │   │
│  │  │  │     ├─ Fetch documents                               │    │   │
│  │  │  │     ├─ Add to backup data                            │    │   │
│  │  │  │     └─ If clients: fetch subcollections              │    │   │
│  │  │  │        ├─ projects                                   │    │   │
│  │  │  │        └─ inquiries                                  │    │   │
│  │  │  ├─ Update metadata                                     │    │   │
│  │  │  └─ Return JSON response                                │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /lib/firebaseAdmin.ts                                            │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Firebase Admin Initialization                           │    │   │
│  │  │  ├─ Check if already initialized                         │    │   │
│  │  │  ├─ Load credentials from env                            │    │   │
│  │  │  │  ├─ NEXT_PUBLIC_FIREBASE_PROJECT_ID                   │    │   │
│  │  │  │  ├─ FIREBASE_CLIENT_EMAIL                             │    │   │
│  │  │  │  └─ FIREBASE_PRIVATE_KEY                              │    │   │
│  │  │  ├─ Initialize admin.app                                 │    │   │
│  │  │  └─ Export db and auth                                   │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE (Database)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Firestore Database                                                      │
│  ├─ admins/                                                              │
│  ├─ chargeSlips/                                                         │
│  ├─ clients/                                                             │
│  │  └─ {clientId}/                                                       │
│  │     ├─ projects/         ← Subcollection                             │
│  │     └─ inquiries/        ← Subcollection                             │
│  ├─ inquiries/                                                           │
│  ├─ projects/                                                            │
│  ├─ quotations/                                                          │
│  ├─ roles/                                                               │
│  ├─ services/                                                            │
│  ├─ catalogSettings/                                                     │
│  └─ activityLogs/                                                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## File System Access API Flow (Chrome/Edge)

```
┌─────────────────────────────────────────────────────────────────┐
│              FILE SYSTEM ACCESS API (CHROME/EDGE)                │
└─────────────────────────────────────────────────────────────────┘

Client receives data
     │
     ├─ Create Blob from JSON
     │
     ├─ Call window.showSaveFilePicker()
     │     │
     │     ├─ suggestedName: "firestore-backup-2024-01-15.json"
     │     └─ types: [{ accept: { 'application/json': ['.json'] } }]
     │
     ├─ Browser shows "Save As" dialog
     │     │
     │     └─ User chooses directory
     │
     ├─ Get file handle
     │
     ├─ Create writable stream
     │
     ├─ Write blob to file
     │
     ├─ Close writable stream
     │
     └─ Done! File saved to chosen location ✅
```

## Standard Download Fallback (Other Browsers)

```
┌─────────────────────────────────────────────────────────────────┐
│           STANDARD DOWNLOAD FALLBACK (FIREFOX/SAFARI)            │
└─────────────────────────────────────────────────────────────────┘

Client receives data
     │
     ├─ Create Blob from JSON
     │
     ├─ Create Object URL
     │     URL.createObjectURL(blob)
     │
     ├─ Create <a> element
     │     href = Object URL
     │     download = filename
     │
     ├─ Append to document
     │
     ├─ Click programmatically
     │
     ├─ Remove from document
     │
     ├─ Revoke Object URL
     │
     └─ Done! File downloads to Downloads folder ✅
```

## Data Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP JSON STRUCTURE                         │
└─────────────────────────────────────────────────────────────────┘

{
  metadata: {
    timestamp: "2024-01-15T14:30:00.000Z",
    totalCollections: 10,
    totalDocuments: 1234,
    collections: ["admins", "clients", ...]
  },
  
  data: {
    admins: [
      { id: "admin1", data: {...} },
      { id: "admin2", data: {...} }
    ],
    
    clients: [
      { id: "client1", data: {...} },
      { id: "client2", data: {...} }
    ],
    
    clientSubcollections: {
      "client1": {
        projects: [
          { id: "proj1", data: {...} }
        ],
        inquiries: [
          { id: "inq1", data: {...} }
        ]
      }
    },
    
    projects: [...],
    quotations: [...],
    // ... other collections
  }
}
```

## Permission System

```
┌─────────────────────────────────────────────────────────────────┐
│                      PERMISSION FLOW                             │
└─────────────────────────────────────────────────────────────────┘

User attempts to access /admin/backup
     │
     ├─ PermissionGuard component checks
     │     │
     │     ├─ Is user authenticated?
     │     │     No → Redirect to /login
     │     │
     │     ├─ Is user Superadmin?
     │     │     No → Show "Access Denied"
     │     │
     │     └─ Has databaseBackup.view permission?
     │           No → Show "Access Denied"
     │           Yes → ✅ Allow access
     │
     └─ User can see backup page
           │
           ├─ Download button enabled
           │
           └─ Can create backups
```

## Environment Variables Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 ENVIRONMENT VARIABLES USAGE                      │
└─────────────────────────────────────────────────────────────────┘

.env.local file
     │
     ├─ NEXT_PUBLIC_* (Client + Server)
     │     └─ NEXT_PUBLIC_FIREBASE_PROJECT_ID
     │
     └─ Private (Server Only)
           ├─ FIREBASE_CLIENT_EMAIL
           └─ FIREBASE_PRIVATE_KEY

During Build:
     │
     ├─ Next.js reads .env.local
     │
     ├─ Injects NEXT_PUBLIC_* into client bundle
     │
     └─ Keeps private vars on server only

At Runtime:
     │
     ├─ Client: Can access NEXT_PUBLIC_*
     │
     └─ Server: Can access all env vars
           │
           └─ /lib/firebaseAdmin.ts uses private vars
                 │
                 └─ Initializes Firebase Admin SDK
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING                               │
└─────────────────────────────────────────────────────────────────┘

Try Download
     │
     ├─ Fetch API fails?
     │     └─ Show error toast
     │         └─ Log to console
     │             └─ Reset loading state
     │
     ├─ User cancels save dialog?
     │     └─ Catch AbortError
     │         └─ Show "Save cancelled" message
     │             └─ Reset loading state
     │
     ├─ File System API not supported?
     │     └─ Fall back to standard download
     │         └─ Show success toast
     │             └─ Reset loading state
     │
     └─ Any other error?
           └─ Catch general error
               └─ Show error toast
                   └─ Reset loading state
```

## Three Backup Methods Comparison

```
┌──────────────┬────────────────┬──────────────┬─────────────────┐
│   METHOD     │    STORAGE     │   TRIGGER    │   BEST FOR      │
├──────────────┼────────────────┼──────────────┼─────────────────┤
│   Download   │ Your computer  │   Manual     │ Any device      │
│   Backup     │ (your choice)  │ (click btn)  │ Local backup    │
├──────────────┼────────────────┼──────────────┼─────────────────┤
│   Server     │ Vercel server  │   Manual     │ Testing         │
│   Backup     │ (/tmp/backups) │ (click btn)  │ Quick restore   │
├──────────────┼────────────────┼──────────────┼─────────────────┤
│ Google Drive │ Google Drive   │  Automatic   │ Scheduled       │
│   Backup     │ (cloud)        │ (Fridays)    │ Off-site backup │
└──────────────┴────────────────┴──────────────┴─────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
     ├─ Firebase Auth
     └─ Session verification

Layer 2: Authorization
     ├─ Role check (Superadmin only)
     └─ Permission check (databaseBackup.view)

Layer 3: Component Guard
     ├─ PermissionGuard wrapper
     └─ Blocks unauthorized access

Layer 4: API Security
     ├─ Server-side permission check
     └─ Firebase Admin SDK (server-only)

Layer 5: Environment Security
     ├─ Private keys server-side only
     ├─ Never exposed to client
     └─ Not committed to Git
```

---

**Visual Summary:**

1. **User clicks download** → 2. **Client requests data** → 3. **Server fetches from Firebase** → 4. **Server returns JSON** → 5. **Client creates file** → 6. **User chooses location** → 7. **File saved!** ✅

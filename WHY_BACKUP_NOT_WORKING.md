# Why Download Backup is Not Working (And How to Fix It)

## 🔴 The Problem

When you click "Download Backup to My Computer", you're seeing an **error** instead of a browse window. This is because:

**Firebase Admin SDK credentials are not configured.**

## 🔍 What's Happening

1. You click the "Download Backup" button ✅
2. The browser sends a request to the server API ✅
3. The server tries to access Firebase Admin SDK ❌
4. Firebase Admin is NOT initialized (no credentials) ❌
5. Server returns error: "Firebase Admin not configured" ❌
6. No browse window appears because the API failed ❌

## ✅ The Solution

You need to add Firebase Admin SDK credentials to your environment variables.

### Step 1: Get Firebase Service Account Key

1. Go to: **https://console.firebase.google.com/**
2. Select your project: **pgc-genomebase**
3. Click ⚙️ (Settings) → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"** button
6. Download the JSON file (save it securely!)

### Step 2: Add to .env.local

Open (or create) `.env.local` in your project root and add:

```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pgc-genomebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
```

**Where to get these values?**

Open the downloaded JSON file and copy:
- `client_email` → paste into `FIREBASE_CLIENT_EMAIL`
- `private_key` → paste into `FIREBASE_PRIVATE_KEY` (including quotes and `\n`)

**Example .env.local file:**

```bash
# Firebase Client (already in your .env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCMy39DYfqNDvRhSf6SNPKqpgqCbKjnSSw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pgc-genomebase.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pgc-genomebase
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pgc-genomebase.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=100362594802
NEXT_PUBLIC_FIREBASE_APP_ID=1:100362594802:web:abe3dde84e61fd848b236b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4G9HC1H0H7

# Firebase Admin SDK (ADD THESE TWO LINES)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@pgc-genomebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Restart Development Server

```bash
npm run dev
```

### Step 4: Test It!

1. Go to: **Admin → Database Backup**
2. Click: **"Download Backup to My Computer"**
3. **Browse window will appear!** 🎉
4. Choose where to save the file
5. Backup downloads successfully! ✅

## 🎯 What You'll See After Setup

### Before (Current - Not Working):
- Click button → Error toast: "Firebase Admin not configured"
- No browse window
- No backup file

### After (With Credentials - Working):
- Click button → Progress bar appears (0% → 90% → 100%)
- **Browse window opens** (Chrome/Edge)
- You choose the folder location
- File saves: `firestore-backup-2024-02-02T14-30-00.json`
- Success toast shows: "Backup saved successfully (1234 documents, 5.2 MB)"

## 🌐 Browser Behavior

| Browser | What Happens |
|---------|--------------|
| **Chrome** | 🎯 Browse window opens - choose any folder |
| **Edge** | 🎯 Browse window opens - choose any folder |
| **Firefox** | 📥 Downloads to Downloads folder |
| **Safari** | 📥 Downloads to Downloads folder |

## 🐛 How to Check If It's Working

### Method 1: Check Browser Console

Open browser Developer Tools (F12) → Console tab, then click "Download Backup":

**❌ If Not Working (No Credentials):**
```
🔵 Fetching backup data from server...
🔵 Response status: 500
❌ Backup failed: {error: "Firebase Admin not configured", details: "..."}
```

**✅ If Working (With Credentials):**
```
🔵 Fetching backup data from server...
🔵 Response status: 200
✅ Backup data received: {timestamp: "...", totalDocuments: 1234}
📦 Creating backup file...
📦 Backup size: 5.2 MB
💾 Opening save dialog...
✅ Browser supports File System Access API
💾 User selected location, writing file...
✅ File saved successfully!
```

### Method 2: Check Server Logs

In your terminal where `npm run dev` is running:

**❌ If Not Working:**
```
⚠️ Firebase Admin credentials not found - skipping initialization
   Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables
```

**✅ If Working:**
```
✅ Firebase Admin initialized
🚀 Starting Firestore backup for download...
🔄 Backing up collection: admins
✅ Backed up 5 documents from admins
...
```

## 📝 Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| No browse window | Missing Firebase Admin credentials | Add credentials to `.env.local` |
| Error: "Firebase Admin not configured" | Environment variables not set | Get service account key from Firebase |
| Button doesn't work | API fails before reaching browse dialog | Restart server after adding credentials |

## ⏱️ Time Required

- Get credentials: **5 minutes**
- Add to .env.local: **2 minutes**
- Restart & test: **1 minute**
- **Total: ~10 minutes**

## 📚 Detailed Documentation

For complete step-by-step instructions with screenshots:
- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md)** - Detailed setup
- **[BACKUP_SYSTEM_GUIDE.md](./BACKUP_SYSTEM_GUIDE.md)** - Complete guide

## 🆘 Still Not Working?

### 1. Verify Environment Variables

```powershell
# Check if variables are set (PowerShell)
$env:FIREBASE_CLIENT_EMAIL
$env:FIREBASE_PRIVATE_KEY
```

If both show values → credentials are loaded ✅  
If empty → add to `.env.local` and restart server ❌

### 2. Check .env.local Location

The file must be in the **project root**:
```
c:\Users\PGCV\Documents\pgc-genomebase\.env.local
```

NOT in any subfolder!

### 3. Verify Private Key Format

The private key must:
- Be wrapped in quotes: `"-----BEGIN..."`
- Keep `\n` characters: `...KEY-----\nMIIE...\n-----END..."`
- Include BEGIN and END markers

### 4. Restart Server

After changing `.env.local`:
```bash
# Stop server (Ctrl+C)
npm run dev
```

## ✅ You'll Know It's Working When...

1. Server logs show: `✅ Firebase Admin initialized`
2. Click button → Progress bar animates smoothly
3. Browse window opens (Chrome/Edge)
4. You can choose where to save
5. File downloads successfully
6. Toast shows: "Backup saved successfully"

---

**Once you add the credentials, everything will work perfectly!** 🚀

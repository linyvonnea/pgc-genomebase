# 🚀 Quick Start: Download Backup Feature

## What You Need to Do NOW

### Step 1: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/
2. Select project: **pgc-genomebase**
3. Click ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file (keep it safe!)

### Step 2: Add Credentials to .env.local

Open `.env.local` and add these two lines:

```bash
FIREBASE_CLIENT_EMAIL=<paste client_email from JSON>
FIREBASE_PRIVATE_KEY="<paste private_key from JSON including quotes and \n>"
```

**Example:**
```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@pgc-genomebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Restart Server

```bash
npm run dev
```

### Step 4: Test It!

1. Login as superadmin
2. Go to: **Admin → Database Backup**
3. Click: **"Download Backup to My Computer"**
4. Choose where to save (Chrome/Edge) or it auto-downloads (other browsers)
5. Done! 🎉

---

## Browser Behavior

- **Chrome/Edge:** You choose the folder ✅
- **Firefox/Safari:** Downloads to Downloads folder
- **All browsers:** Works perfectly!

---

## What If It Doesn't Work?

### Error: "Service account object must contain..."

**Fix:** 
- Make sure `FIREBASE_PRIVATE_KEY` is wrapped in quotes
- Keep the `\n` characters
- Copy the entire key from the JSON file

### Error: "The default Firebase app does not exist"

**Fix:**
- Check both environment variables are set
- Restart the dev server: `npm run dev`
- Verify the project ID matches

### Build Error

**Fix:**
- Ensure `.env.local` exists in project root
- Both variables must be present
- Try `npm run build` again

---

## For Vercel Deployment

Add these in Vercel dashboard:

**Settings → Environment Variables:**
1. `FIREBASE_CLIENT_EMAIL` = (paste value)
2. `FIREBASE_PRIVATE_KEY` = (paste value)
3. Click **Save**
4. **Redeploy**

---

## 📚 Full Documentation

- **Setup Guide:** [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md)
- **Complete Backup Guide:** [BACKUP_SYSTEM_GUIDE.md](./BACKUP_SYSTEM_GUIDE.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## ✅ Done!

Once you add the credentials and restart, the download backup feature will work on:
- ✅ Any device (desktop, laptop, mobile)
- ✅ Any browser (Chrome, Edge, Firefox, Safari)
- ✅ Any operating system (Windows, macOS, Linux)

**The backup downloads as a JSON file with all your Firestore data!** 📥

# Deployment Guide

## Fixing Deployment Errors

The most common deployment error is **missing environment variables**. Follow these steps to configure your deployment:

---

## Required Environment Variables

Your deployment platform (Vercel, Netlify, etc.) needs these environment variables:

### Firebase Client Configuration (Public)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### Firebase Admin SDK (Private - Server-side only)
```
FIREBASE_SERVICE_ACCOUNT
```

---

## How to Add Environment Variables on Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Name: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: `your_actual_api_key`
   - Environment: Production, Preview, Development (check all)
5. Repeat for all variables listed above

### For FIREBASE_SERVICE_ACCOUNT:
- Copy the **entire contents** of your `serviceAccountKey.json` file
- **Minify it to a single line** (remove all newlines and spaces)
- Example: `{"type":"service_account","project_id":"your-project",...}`
- Paste this single line as the value

---

## Where to Get Firebase Configuration

### Client Config (NEXT_PUBLIC_* variables):
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **General**
4. Scroll to **Your apps** → Select your web app
5. Copy the values from `firebaseConfig`

### Admin Service Account:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (this is your `serviceAccountKey.json`)
6. **⚠️ Keep this file secret! Never commit to Git!**

---

## Redeploy

After adding all environment variables:
1. Go to your project's **Deployments** tab on Vercel
2. Click the three dots (**...**) on the failed deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a fresh deployment.

---

## Troubleshooting

### Build still fails?
- Verify all environment variable names are **exactly** as shown (case-sensitive)
- Ensure `FIREBASE_SERVICE_ACCOUNT` is a valid single-line JSON
- Check that you selected all environments (Production, Preview, Development)

### Firebase errors in production?
- Verify your Firebase project has "Web" platform enabled
- Check Firebase Authentication is enabled
- Verify Firestore Database is created and rules are set

---

## Local Development

For local development, copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual Firebase credentials.

# Firebase Storage Setup Guide

This guide explains how to configure Firebase Storage for file uploads in the PGC GenomeBase application.

## Overview

The file upload feature allows clients to upload methodology documents (PDF, DOC, DOCX) when submitting inquiry requests. These files are stored in Firebase Storage and can be viewed by admins.

## Prerequisites

- Firebase project already configured
- Firebase Authentication enabled
- Environment variables set up for Firebase configuration

## Setup Steps

### 1. Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started**
5. Choose a Cloud Storage location (preferably close to your users)
6. Click **Done**

### 2. Configure Storage Rules

Firebase Storage rules control who can read and write files. To allow authenticated users to upload methodology files:

1. In Firebase Console, go to **Storage** → **Rules**
2. Replace the rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Methodology files - for client inquiry submissions
    match /methodology-files/{allPaths=**} {
      // Anyone can read/download files
      allow read;
      // Only authenticated users can upload
      allow write: if request.auth != null;
    }
    
    // Optional: Add more folder-specific rules here
    // Example: Quotation files
    // match /quotation-files/{allPaths=**} {
    //   allow read: if request.auth != null;
    //   allow write: if request.auth != null;
    // }
  }
}
```

3. Click **Publish**

**Security Notes:**
- `allow read;` - Anyone with the URL can view/download files
- `allow write: if request.auth != null;` - Only signed-in users can upload
- Files are stored with unique UUID names to prevent conflicts

### 3. Configure CORS (Required for Web Uploads)

CORS (Cross-Origin Resource Sharing) must be configured to allow uploads from your domain.

#### For Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Open **Cloud Shell** (the `>_` icon in the top right)
4. Create a CORS configuration file:
   ```bash
   nano cors.json
   ```
5. Paste the following configuration:
   ```json
   [
     {
       "origin": ["https://pgc-genomebase.vercel.app", "http://localhost:3000", "http://localhost:3002"],
       "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
6. Save the file (Ctrl+O, Enter, Ctrl+X)
7. Apply the CORS configuration (replace `YOUR-BUCKET-NAME` with your actual bucket name):
   ```bash
   gsutil cors set cors.json gs://YOUR-BUCKET-NAME
   ```
   
   **Example:**
   ```bash
   gsutil cors set cors.json gs://pgc-genomebase.appspot.com
   ```

8. Verify the CORS configuration:
   ```bash
   gsutil cors get gs://YOUR-BUCKET-NAME
   ```

**Note:** Your bucket name is typically `YOUR-PROJECT-ID.appspot.com` or `YOUR-PROJECT-ID.firebasestorage.app`

### 4. Environment Variables

Ensure your `.env.local` file includes the Storage Bucket configuration:

```env
# Firebase Configuration (Client-side - Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 5. Vercel Deployment Configuration

If deploying to Vercel, add the environment variables:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all Firebase variables (including `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`)
4. Select all environments (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## File Upload Workflow

### Client Side (User Flow)

1. **User navigates** to `/client/inquiry-request`
2. **User fills** the inquiry form
3. **User uploads** a methodology file (optional)
   - File is validated (max 10MB, PDF/DOC/DOCX only)
   - File is uploaded to Firebase Storage with a unique UUID name
   - Download URL is stored in form state
4. **User submits** the inquiry
5. The download URL is saved to Firestore in the `inquiries` collection

### Admin Side (Viewing Flow)

1. **Admin views** inquiry details at `/admin/inquiry/[inquiryId]`
2. If a methodology file was uploaded, a **"View Uploaded File"** link appears
3. **Clicking the link** opens the file in a new tab
4. The file can also be viewed in:
   - `/admin/quotation-threads/[inquiryId]` - Quotation thread page
   - Email notifications sent to admins (as a clickable link)

## File Structure

Files are organized in Firebase Storage as follows:

```
gs://your-bucket-name/
└── methodology-files/
    ├── 12345678-1234-1234-1234-123456789abc.pdf
    ├── abcdefgh-5678-5678-5678-abcdefghijkl.docx
    └── ...
```

Each file is named with a UUID to:
- Prevent filename conflicts
- Enhance security (filenames are unpredictable)
- Maintain original file extension

## Testing

### Local Testing

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/client/inquiry-request`
3. Fill in the form and upload a test file
4. Check the browser console for upload logs:
   - `[File Upload] Starting upload: {...}`
   - `[File Upload] Upload successful, getting download URL...`
   - `[File Upload] Download URL obtained: https://...`

### Production Testing

1. Deploy to Vercel
2. Navigate to your production URL
3. Test file upload functionality
4. Verify files appear in Firebase Storage console

## Troubleshooting

### Upload Fails with "Failed to upload file"

**Check:**
1. **Firebase Storage Rules** - Ensure authenticated users have write permission
2. **CORS Configuration** - Verify CORS is set correctly for your domain
3. **Environment Variables** - Confirm `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is set in Vercel
4. **Authentication** - User must be signed in to upload files

### Upload Takes Too Long

**Possible Causes:**
- Large file size (check if file is close to 10MB limit)
- Slow internet connection
- Firebase Storage location is far from user's location
- CORS misconfiguration causing retries

**Solutions:**
- Reduce file size
- Choose a Cloud Storage location closer to your users
- Check browser console for specific error messages

### Files Cannot Be Downloaded

**Check:**
1. **Storage Rules** - Ensure read permission is granted
2. **File URL** - Verify the URL is a valid Firebase Storage download URL
3. **Browser Console** - Look for network errors or CORS issues

### "Permission denied" Error

**Fix:**
Update your Firebase Storage rules to allow write access for authenticated users:
```javascript
allow write: if request.auth != null;
```

## Cost Considerations

Firebase Storage pricing (as of 2026):

| Item | Cost |
|------|------|
| Storage | $0.026/GB per month |
| Download | $0.12/GB |
| Upload | $0.05 per 10,000 operations |

**Example Monthly Costs:**
- 100 inquiries/month with 2MB files each = 0.2GB storage = **$0.005/month**
- Each file downloaded 5 times = 1GB total = **$0.12/month**
- Total: **~$0.13/month**

Firebase offers a **free tier**:
- 5GB stored
- 1GB/day downloads
- 20,000 uploads per day

For typical usage, you will likely stay within the free tier.

## File Validation Rules

Current validation rules:
- **Maximum file size:** 10MB
- **Allowed formats:** PDF, DOC, DOCX
- **MIME types:**
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

To change these rules, edit `src/lib/fileUpload.ts`:

```typescript
export function validateFile(
  file: File, 
  maxSizeMB: number = 10,  // Change max size here
  allowedTypes: string[] = [
    'application/pdf',
    // Add more MIME types here
  ]
): boolean {
  // validation logic
}
```

## Security Best Practices

1. **Always validate files on the client side** before upload
2. **Use Firebase Security Rules** to enforce server-side validation
3. **Store files with UUID names** to prevent enumeration attacks
4. **Limit file sizes** to prevent storage abuse
5. **Restrict uploads to authenticated users only**
6. **Use signed URLs** for sensitive files (current implementation uses public URLs)
7. **Implement rate limiting** if you expect high traffic
8. **Monitor Firebase Storage usage** to detect unusual activity

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Review Firebase Storage logs in Firebase Console
3. Verify all setup steps have been completed
4. Check network requests in browser DevTools

## Related Files

- `src/lib/firebase.ts` - Firebase initialization and Storage instance
- `src/lib/fileUpload.ts` - File upload and validation utilities
- `src/app/client/inquiry-request/page.tsx` - Client upload form
- `src/app/admin/inquiry/[inquiryId]/page.tsx` - Admin file view
- `src/app/admin/quotation-threads/[inquiryId]/page-client.tsx` - Thread file view
- `src/app/actions/inquiryActions.ts` - Email notification with file link

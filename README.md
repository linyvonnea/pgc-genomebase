# PGC GenomeBase

A Next.js application for managing genomics projects, quotations, and client relationships with integrated Firestore database backup features.

## Features

- 🔐 Role-based access control (Superadmin, Admin, User)
- 📊 Dashboard with real-time analytics
- 💼 Client and project management
- 📝 Quotation generation and tracking
- 📈 Charge slip management
- 💾 **Three Backup Methods:**
  - **Download Backup** - Save to any device/browser with directory selection
  - **Server Backup** - Create backups on Vercel server
  - **Google Drive Auto Backup** - Scheduled incremental backups every Friday

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project with Firestore
- (Optional) Google Drive API credentials for auto-backups

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Add your Firebase configuration to `.env.local`:
   - Client SDK credentials (already configured)
   - **Firebase Admin SDK credentials** (required for backup download feature)
   
   See [FIREBASE_ADMIN_SETUP.md](./FIREBASE_ADMIN_SETUP.md) for detailed instructions.

### Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Backup Features

This application includes three comprehensive backup methods:

### 1. Download Backup to Your Computer ⬇️
- **Best for:** Individual users wanting local backups
- **Works on:** Any browser, any device (desktop, laptop, mobile)
- **Directory Selection:** 
  - Chrome/Edge: Choose exact folder location
  - Other browsers: Downloads to default Downloads folder
- **Setup Required:** Firebase Admin SDK credentials ([Setup Guide](./FIREBASE_ADMIN_SETUP.md))

### 2. Server Backup (Advanced) 🖥️
- **Best for:** Automated server-side backups
- **Storage:** Vercel server filesystem
- **Access:** Superadmin only
- **Use Case:** Quick backups accessible from server

### 3. Google Drive Automatic Backup 📅
- **Best for:** Scheduled incremental backups
- **Schedule:** Every Friday at 6:00 PM
- **Features:** 
  - Incremental backup (saves ~73% storage)
  - Automatic change tracking
  - Cloud storage integration
- **Setup Required:** Google Drive API credentials ([Setup Guide](./GOOGLE_DRIVE_BACKUP_GUIDE.md))

### Security & Permissions

All backup features are **restricted to Superadmin role only** through the `databaseBackup` permission module.

## Documentation

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Fix deployment errors and configure environment variables
- [Firebase Admin Setup](./FIREBASE_ADMIN_SETUP.md) - Configure Firebase Admin SDK for backup downloads
- [Google Drive Backup Guide](./GOOGLE_DRIVE_BACKUP_GUIDE.md) - Set up automatic Drive backups
- [Activity Logging Guide](./ACTIVITY_LOGGING_GUIDE.md) - Configure activity tracking
- [Catalog Management Guide](./CATALOG_MANAGEMENT_GUIDE.md) - Manage service catalog
- [Migration Guide](./MIGRATION_GUIDE.md) - Database migration information

## Deployment

### Deploying to Vercel/Netlify/Other Platforms

⚠️ **Important:** Before deploying, you must configure environment variables on your deployment platform.

See the **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** for detailed instructions on:
- Setting up required environment variables
- Configuring Firebase credentials
- Troubleshooting common deployment errors

### Quick Deploy Steps:
1. Push your code to GitHub
2. Connect your repository to Vercel/Netlify
3. **Add all environment variables** (see [Deployment Guide](./DEPLOYMENT_GUIDE.md))
4. Deploy!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

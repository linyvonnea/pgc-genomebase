/**
 * Scheduled Backup API Route
 * This route can be called by a cron job (e.g., Vercel Cron) to perform automatic backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { performIncrementalBackup, saveBackupMetadata, isBackupDay } from '@/services/googleDriveBackupService';
import { Readable } from 'stream';

// Collections to backup
const COLLECTIONS = [
  'admins',
  'chargeSlips',
  'clients',
  'inquiries',
  'projects',
  'quotations',
  'roles',
  'services',
  'catalogSettings',
  'activityLogs'
];

// Google Drive folder ID where backups will be stored
// You need to create a folder in Google Drive and get its ID
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

/**
 * Initialize Google Drive API
 */
function getGoogleDriveClient() {
  // You need to set up OAuth2 credentials in Google Cloud Console
  // and add them as environment variables
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Upload backup to Google Drive
 */
async function uploadToGoogleDrive(fileName: string, fileContent: string) {
  const drive = getGoogleDriveClient();

  const fileMetadata = {
    name: fileName,
    parents: GOOGLE_DRIVE_FOLDER_ID ? [GOOGLE_DRIVE_FOLDER_ID] : undefined,
  };

  const media = {
    mimeType: 'application/json',
    body: Readable.from([fileContent]),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, size',
  });

  return response.data;
}

/**
 * POST endpoint for scheduled backup
 * Can be called by Vercel Cron or any scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Google Drive is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      return NextResponse.json(
        { 
          error: 'Google Drive not configured',
          message: 'Please set up Google service account credentials in environment variables'
        },
        { status: 500 }
      );
    }

    // Check if today is Friday (backup day)
    if (!isBackupDay()) {
      return NextResponse.json({
        success: true,
        message: 'Not a backup day (only runs on Fridays)',
        skipped: true
      });
    }

    console.log('🚀 Starting incremental backup to Google Drive...');

    // Perform incremental backup
    const metadata = await performIncrementalBackup(COLLECTIONS);

    console.log(`📊 Incremental backup found ${metadata.changedDocuments} changed documents`);

    // If no changes, skip upload
    if (metadata.changedDocuments === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected since last backup',
        metadata
      });
    }

    // Create backup file content
    const backupData = {
      metadata,
      timestamp: new Date().toISOString(),
      collections: COLLECTIONS,
    };

    const fileName = `firestore-incremental-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Upload to Google Drive
    const uploadResult = await uploadToGoogleDrive(fileName, fileContent);

    console.log('✅ Backup uploaded to Google Drive:', uploadResult);

    return NextResponse.json({
      success: true,
      message: 'Incremental backup completed successfully',
      metadata,
      googleDrive: {
        fileId: uploadResult.id,
        fileName: uploadResult.name,
        size: uploadResult.size,
      }
    });

  } catch (error) {
    console.error('❌ Scheduled backup failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Backup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check backup status
 */
export async function GET(request: NextRequest) {
  try {
    const { performIncrementalBackup, getLastBackupMetadata } = await import('@/services/googleDriveBackupService');
    
    const lastBackup = await getLastBackupMetadata();

    return NextResponse.json({
      success: true,
      lastBackup,
      nextBackupDay: 'Friday',
      isToday: isBackupDay(),
      configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

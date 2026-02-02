import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Try to use environment variables first (for Vercel)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized from environment variable');
      } else {
        // Fall back to service account file (for local)
        const serviceAccountPath = path.join(process.cwd(), 'scripts', 'serviceAccountKey.json');
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized from file');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      throw new Error('Firebase Admin initialization failed');
    }
  }
}

// Check if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Firestore backup via API...');
    console.log('Environment:', isVercel ? 'Vercel (Serverless)' : 'Local/Server');
    
    if (isVercel) {
      // On Vercel: Create backup data in memory and return for download
      return await createInMemoryBackup();
    } else {
      // On local/server: Use the file-based backup script
      return await createFileBackup();
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backup failed',
        details: errorMessage,
        message: isVercel 
          ? 'Vercel serverless functions have timeout limits. Please use the download button to get backup data.'
          : 'Backup process failed. Check server logs for details.'
      },
      { status: 500 }
    );
  }
}

async function createInMemoryBackup() {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  console.log('📦 Creating in-memory backup for Vercel...');
  const startTime = Date.now();
  
  // Get all collections
  const collections = await db.listCollections();
  const backupData: any = {
    timestamp: new Date().toISOString(),
    collections: {},
    metadata: {
      totalCollections: collections.length,
      totalDocuments: 0,
      backupDuration: 0
    }
  };
  
  let totalDocs = 0;
  
  // Backup each collection (limit to prevent timeout)
  for (const collection of collections) {
    try {
      const snapshot = await collection.limit(1000).get(); // Limit for Vercel
      const data: any[] = [];
      
      snapshot.forEach(doc => {
        data.push({
          id: doc.id,
          data: doc.data()
        });
      });
      
      backupData.collections[collection.id] = data;
      totalDocs += data.length;
      console.log(`✅ Backed up ${data.length} documents from ${collection.id}`);
    } catch (error) {
      console.error(`❌ Error backing up ${collection.id}:`, error);
    }
  }
  
  backupData.metadata.totalDocuments = totalDocs;
  backupData.metadata.backupDuration = Date.now() - startTime;
  
  console.log(`✅ Backup completed: ${totalDocs} documents in ${backupData.metadata.backupDuration}ms`);
  
  return NextResponse.json({
    success: true,
    message: 'Backup data created successfully',
    data: backupData,
    downloadReady: true
  });
}

async function createFileBackup() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const scriptPath = path.join(process.cwd(), 'scripts', 'firestore-backup.js');
  console.log('📁 Script path:', scriptPath);
  
  // Execute backup script
  const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300000
  });
  
  if (stderr) {
    console.error('⚠️  Backup stderr:', stderr);
  }
  
  console.log('✅ Backup completed successfully');
  
  return NextResponse.json({
    success: true,
    message: 'Backup completed successfully',
    output: stdout.split('\n').slice(-5).join('\n')
  });
}
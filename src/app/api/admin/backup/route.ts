import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Use environment variables (required for serverless deployment)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized from environment variable');
      } else {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not found');
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required for deployment');
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
    
    // Always use in-memory backup for serverless compatibility
    return await createInMemoryBackup();
    
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
  // File-based backup not available in serverless environment
  return NextResponse.json(
    { 
      success: false, 
      error: 'File-based backup not available in serverless environment',
      message: 'Please use the in-memory backup option or local scripts'
    },
    { status: 501 }
  );
}
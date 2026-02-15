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

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    
    const db = admin.firestore();
    
    // Get all collections
    const collections = await db.listCollections();
    const collectionsData: { [key: string]: number } = {};
    let totalDocuments = 0;
    
    // Count documents in each collection
    for (const collection of collections) {
      try {
        const snapshot = await collection.count().get();
        const docCount = snapshot.data().count;
        collectionsData[collection.id] = docCount;
        totalDocuments += docCount;
      } catch (error) {
        console.warn(`⚠️  Could not count documents in collection ${collection.id}:`, error);
        collectionsData[collection.id] = 0;
      }
    }
    
    // Estimate size (rough calculation based on document count)
    const estimatedSizeBytes = totalDocuments * 2048; // Rough estimate: 2KB per document
    const estimatedSize = formatBytes(estimatedSizeBytes);
    
    const stats = {
      totalCollections: collections.length,
      totalDocuments,
      estimatedSize,
      collectionsBreakdown: collectionsData,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📊 Database stats calculated:', stats);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('❌ Error calculating database stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate database statistics' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
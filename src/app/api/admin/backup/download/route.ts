import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

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

/**
 * POST endpoint to download backup data as JSON
 * Returns all Firestore data for client-side download
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!isFirebaseAdminReady() || !adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Admin not configured',
          details: 'Firebase Admin SDK credentials are not set. Please configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.'
        },
        { status: 500 }
      );
    }

    console.log('🚀 Starting Firestore backup for download...');
    
    const backupData: any = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalCollections: 0,
        totalDocuments: 0,
        collections: []
      },
      data: {}
    };

    let totalDocuments = 0;

    // Backup each collection
    for (const collectionName of COLLECTIONS) {
      console.log(`🔄 Backing up collection: ${collectionName}`);
      
      const snapshot = await adminDb.collection(collectionName).get();
      const documents: any[] = [];
      
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        documents.push({
          id: doc.id,
          data: doc.data()
        });
      });

      backupData.data[collectionName] = documents;
      backupData.metadata.collections.push(collectionName);
      totalDocuments += documents.length;

      console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);

      // Also backup subcollections for clients
      if (collectionName === 'clients') {
        const clientSubcollections: any = {};
        
        for (const doc of snapshot.docs) {
          const clientId = doc.id;
          
          // Backup projects subcollection
          const projectsSnapshot = await adminDb
            .collection('clients')
            .doc(clientId)
            .collection('projects')
            .get();
          
          const projects: any[] = [];
          projectsSnapshot.forEach((projectDoc: QueryDocumentSnapshot<DocumentData>) => {
            projects.push({
              id: projectDoc.id,
              data: projectDoc.data()
            });
          });

          // Backup inquiries subcollection
          const inquiriesSnapshot = await adminDb
            .collection('clients')
            .doc(clientId)
            .collection('inquiries')
            .get();
          
          const inquiries: any[] = [];
          inquiriesSnapshot.forEach((inquiryDoc: QueryDocumentSnapshot<DocumentData>) => {
            inquiries.push({
              id: inquiryDoc.id,
              data: inquiryDoc.data()
            });
          });

          if (projects.length > 0 || inquiries.length > 0) {
            clientSubcollections[clientId] = {
              projects,
              inquiries
            };
            totalDocuments += projects.length + inquiries.length;
          }
        }

        if (Object.keys(clientSubcollections).length > 0) {
          backupData.data.clientSubcollections = clientSubcollections;
        }
      }
    }

    backupData.metadata.totalCollections = COLLECTIONS.length;
    backupData.metadata.totalDocuments = totalDocuments;

    console.log(`✅ Backup completed: ${totalDocuments} documents from ${COLLECTIONS.length} collections`);

    // Return backup data as JSON
    return NextResponse.json({
      success: true,
      backup: backupData
    });

  } catch (error) {
    console.error('❌ Backup download failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Backup download failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

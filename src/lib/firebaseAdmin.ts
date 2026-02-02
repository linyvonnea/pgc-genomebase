/**
 * Firebase Admin SDK for server-side operations
 * This file should only be imported in API routes or server components
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check if we're in a server environment
    if (typeof window === 'undefined') {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin initialized');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;

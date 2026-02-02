/**
 * Firebase Admin SDK for server-side operations
 * This file should only be imported in API routes or server components
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check if we're in a server environment and credentials are available
    if (typeof window === 'undefined') {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Only initialize if all required credentials are present
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin initialized');
      } else {
        console.warn('⚠️ Firebase Admin credentials not found - skipping initialization');
        console.warn('   Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables');
      }
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

// Export helper functions that check if Firebase is initialized
const isInitialized = () => admin.apps.length > 0;

export const db = isInitialized() ? admin.firestore() : null as any;
export const auth = isInitialized() ? admin.auth() : null as any;

// Helper to check if Firebase Admin is ready
export const isFirebaseAdminReady = () => isInitialized();
export default admin;

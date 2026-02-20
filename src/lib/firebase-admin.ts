// src/lib/firebase-admin.ts
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// This is used for server-side operations that need to bypass client-side security rules
// or perform administrative tasks.

if (!admin.apps.length) {
  try {
    // Try to load service account from environment variable first (Vercel/Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // For Firestore, we don't need databaseURL but for other services we might
        // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
      console.log("✅ Firebase Admin initialized via environment variable");
    } 
    // Fallback to local service account key file for development
    else {
      // In production, NEVER use a file. Use environment variables.
      // But for local development, we check if the file exists.
      try {
        const serviceAccount = require("../../scripts/serviceAccountKey.json");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized via local serviceAccountKey.json");
      } catch (fileError) {
        console.warn("⚠️ No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT not set.");
        // We don't initialize here to avoid crashing if it's not strictly needed for all routes
      }
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export default admin;

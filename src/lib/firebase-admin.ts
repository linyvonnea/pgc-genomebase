// src/lib/firebase-admin.ts
import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try environment variable first (for Vercel/Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized via environment variable");
    } else {
      // Fallback: load from local file using absolute path based on process.cwd()
      const keyPath = path.join(process.cwd(), "scripts", "serviceAccountKey.json");
      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin initialized via serviceAccountKey.json");
      } else {
        console.error("❌ serviceAccountKey.json not found at:", keyPath);
      }
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export default admin;

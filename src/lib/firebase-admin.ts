// src/lib/firebase-admin.ts
import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

function parseServiceAccountFromEnv() {
  // Option 1: full JSON string in one env var
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  // Option 2: base64-encoded full JSON (common workaround for CI/CD env handling)
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (rawBase64) {
    const decoded = Buffer.from(rawBase64, "base64").toString("utf-8");
    return JSON.parse(decoded);
  }

  // Option 3: split fields
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try environment variables first (for Vercel/Production)
    const serviceAccount = parseServiceAccountFromEnv();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized via environment variables");
    } else {
      // Fallback: load from local file using absolute path based on process.cwd()
      const keyPath = path.join(process.cwd(), "scripts", "serviceAccountKey.json");
      console.log("🔍 Checking for serviceAccountKey at:", keyPath);
      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin initialized via serviceAccountKey.json");
      } else {
        console.error(
          "❌ Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
        );
        console.error("❌ serviceAccountKey.json not found at:", keyPath);
      }
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
if (!adminDb) {
  console.error("❌ adminDb failed to initialize at module level. admin.apps.length:", admin.apps.length);
}

export function getFirestoreDb() {
  if (adminDb) return adminDb;
  if (admin.apps.length > 0) return admin.firestore();
  return null;
}

export default admin;

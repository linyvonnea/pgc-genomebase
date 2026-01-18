// Script to fix corrupted timestamp in CL-2025-308
// Run with: node scripts/fixCorruptedTimestamp.cjs

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('❌ Error: service-account-key.json not found');
  console.error('Place your Firebase service account key at the root of the project');
  process.exit(1);
}

const db = admin.firestore();

async function fixCorruptedTimestamp() {
  try {
    console.log('🔧 Fixing corrupted timestamp for CL-2025-308...');
    
    const docRef = db.collection('clients').doc('CL-2025-308');
    
    // Set createdAt to server timestamp
    await docRef.update({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Successfully fixed CL-2025-308 timestamp');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing timestamp:', error);
    process.exit(1);
  }
}

fixCorruptedTimestamp();

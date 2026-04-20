#!/usr/bin/env node
// One-time migration: convert clientRequests.status 'rejected' -> 'cancelled'
// Run: node scripts/migrate-rejected-to-cancelled.cjs

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error('Could not load serviceAccountKey.json from scripts/:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrate() {
  console.log('Starting migration: clientRequests (rejected -> cancelled)');

  const q = db.collection('clientRequests').where('status', '==', 'rejected');
  const snapshot = await q.get();

  if (snapshot.empty) {
    console.log('No documents with status=\'rejected\' found. Nothing to do.');
    return;
  }

  console.log(`Found ${snapshot.size} document(s) to update.`);

  // Use batches of up to 500
  const docs = snapshot.docs;
  const batchSize = 450; // keep below 500 to be safe
  let updated = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    updated += chunk.length;
    console.log(`Committed batch: updated ${updated}/${docs.length}`);
  }

  console.log(`Migration complete. Updated ${updated} document(s).`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

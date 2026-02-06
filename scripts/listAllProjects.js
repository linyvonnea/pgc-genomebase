const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  console.log(`Total projects: ${snapshot.size}`);
  snapshot.forEach(doc => {
    console.log(`ID: ${doc.id}`, doc.data());
  });
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
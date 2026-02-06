const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  let pidCount = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.pid && data.pid.trim() !== '') {
      pidCount++;
    }
  });
  console.log(`Total projects with non-blank pid: ${pidCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
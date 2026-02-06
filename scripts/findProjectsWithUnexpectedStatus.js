const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const EXPECTED_STATUSES = ['Ongoing', 'Completed', 'Cancelled'];

async function main() {
  const snapshot = await db.collection('projects').get();
  const unexpected = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const status = data.status || '';
    if (!EXPECTED_STATUSES.includes(status)) {
      unexpected.push({ id: doc.id, status });
    }
  });
  console.log(`Found ${unexpected.length} projects with unexpected or missing status:`);
  unexpected.forEach(p => console.log(`ID: ${p.id}, Status: '${p.status}'`));
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
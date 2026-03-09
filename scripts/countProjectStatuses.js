const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  const statusCounts = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const status = (data.status || '').trim();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  console.log('Project status counts:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`Status: '${status}' - Count: ${count}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
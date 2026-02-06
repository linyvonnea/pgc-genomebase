const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  const blankPid = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.pid || data.pid.trim() === '') {
      blankPid.push({ id: doc.id, ...data });
    }
  });
  console.log(`Found ${blankPid.length} projects with blank pid field:`);
  blankPid.forEach(p => {
    console.log(`ID: ${p.id}, Title: ${p.title || ''}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  const projectsByStatus = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const status = (data.status || '').trim();
    if (!projectsByStatus[status]) projectsByStatus[status] = [];
    projectsByStatus[status].push({ id: doc.id, ...data });
  });
  Object.entries(projectsByStatus).forEach(([status, projects]) => {
    console.log(`\nStatus: '${status}' - Count: ${projects.length}`);
    projects.forEach(p => {
      console.log(`  ID: ${p.id}, Title: ${p.title || ''}`);
    });
  });
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
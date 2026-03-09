const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const XLSX = require('xlsx');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('projects').get();
  const projects = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    projects.push({ id: doc.id, ...data });
  });

  // Convert Firestore Timestamp to JS Date for Excel
  const cleanProjects = projects.map(p => {
    const cleaned = { ...p };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] && cleaned[key]._seconds) {
        cleaned[key] = new Date(cleaned[key]._seconds * 1000);
      }
    });
    return cleaned;
  });

  const ws = XLSX.utils.json_to_sheet(cleanProjects);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  XLSX.writeFile(wb, 'projects_export.xlsx');
  console.log('Exported projects to projects_export.xlsx');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
const admin = require("firebase-admin");
const fs = require("fs");

// Load your service account key
admin.initializeApp({
  credential: admin.credential.cert("pgc-genomebase-firebase-adminsdk-fbsvc-606a85d8a7.json"),
});

const db = admin.firestore();

// Export all collections
async function exportFirestore() {
  const collections = await db.listCollections();
  for (const collection of collections) {
    const snapshot = await collection.get();
    const data = [];

    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    fs.writeFileSync(`${collection.id}.json`, JSON.stringify(data, null, 2));
    console.log(`Saved ${collection.id}.json`);
  }
}

exportFirestore();

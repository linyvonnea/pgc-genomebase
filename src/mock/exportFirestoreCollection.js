const admin = require("firebase-admin");
const fs = require("fs");

// Update the path to your service account key if needed
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportCollection(collectionName, outputFile) {
  const snapshot = await db.collection(collectionName).get();
  const data = {};

  snapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`Exported ${collectionName} to ${outputFile}`);
}

// Example usage: export the "inquiries" collection
exportCollection("inquiries", "./src/mock/inquiriesFirebase.json");
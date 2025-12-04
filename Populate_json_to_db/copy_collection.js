const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(require("./pgc-genomebase-firebase-adminsdk-fbsvc-606a85d8a7.json"))
});

const db = admin.firestore();

// CHANGE THIS
const SOURCE = "clients";
const TARGET = "clients_backup";

async function copyCollection() {
  const snapshot = await db.collection(SOURCE).get();

  if (snapshot.empty) {
    console.log("❌ Source collection is empty.");
    return;
  }

  for (const doc of snapshot.docs) {
    await db.collection(TARGET).doc(doc.id).set(doc.data());
    console.log(`Copied: ${doc.id}`);
  }

  console.log("✅ Collection copied successfully!");
}

copyCollection().catch(console.error);

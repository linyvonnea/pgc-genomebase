const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Copy all documents from one collection to another.
 * Does NOT include subcollections.
 */
async function copyCollection(source, target) {
  const snapshot = await db.collection(source).get();

  if (snapshot.empty) {
    console.log(`No documents found in ${source}`);
    return;
  }

  const batch = db.batch();

  snapshot.forEach(doc => {
    const newDocRef = db.collection(target).doc(doc.id);
    batch.set(newDocRef, doc.data());
  });

  await batch.commit();
  console.log(`Copied ${snapshot.size} documents from '${source}' → '${target}'`);
}

copyCollection("oldCollectionName", "newCollectionName");

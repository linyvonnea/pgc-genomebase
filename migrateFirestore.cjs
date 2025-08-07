const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccount.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const data = JSON.parse(fs.readFileSync("./firestore_cleaned_export.json", "utf8"));

const dateFields = [
  "dateReceived",
  "createdAt",
  "dateIssued",
  "datePaid",
  "dateOfOR",
  "date",
  "startDate",
  "endDate"
];

function sanitizeValue(key, value) {
  if (value === null || value === undefined || value === "null") return undefined;
  if (typeof value === "object" && value.type === "firestore/timestamp/1.0") {
    return new Timestamp(value.seconds, value.nanoseconds);
  }
  if (dateFields.includes(key) && typeof value === "string" && !isNaN(Date.parse(value))) {
    return Timestamp.fromDate(new Date(value));
  }
  return value;
}

function sanitizeDoc(doc) {
  const sanitized = {};
  for (const [k, v] of Object.entries(doc)) {
    const val = sanitizeValue(k, v);
    if (val !== undefined) sanitized[k] = val;
  }
  return sanitized;
}

// 🔥 Delete all existing docs in a collection
async function purgeCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    console.log(`ℹ️ No documents found in ${collectionName}, skipping purge.`);
    return;
  }

  console.log(`🗑️ Purging ${batchSize} docs from ${collectionName}...`);
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`✅ Purged ${batchSize} docs from ${collectionName}`);
}

async function importCollections() {
  // Step 1: Purge only chargeSlips
  await purgeCollection("chargeSlips");

  // Step 2: Import collections
  for (const [collectionName, documents] of Object.entries(data)) {
    if (!Array.isArray(documents)) continue;

    console.log(`🚀 Importing ${documents.length} into ${collectionName}...`);
    for (const doc of documents) {
      try {
        let id;

        if (collectionName === "chargeSlips") {
          id = doc.chargeSlipNo; // ✅ Always CS-based IDs
        } else {
          id =
            doc.id ||
            doc.referenceNumber ||
            doc.projectId ||
            doc.clientId;
        }

        if (!id) {
          console.warn(`⚠️ Skipping ${collectionName} document (no ID)`, doc);
          continue;
        }

        const sanitized = sanitizeDoc(doc);
        await db.collection(collectionName).doc(String(id)).set(sanitized);
        console.log(`✅ Imported ${collectionName}/${id}`);
      } catch (err) {
        console.error(`❌ Failed to import ${collectionName}:`, err.message);
      }
    }
  }
  console.log("🎉 Import completed for all collections!");
}

importCollections();
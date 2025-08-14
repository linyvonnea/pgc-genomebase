// migrateFirestore.cjs
const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccount.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Load data
const data = JSON.parse(fs.readFileSync("./finalData.json", "utf8"));

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

  if (typeof value === "object" && value?.seconds !== undefined && value?.nanoseconds !== undefined) {
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
  // ✅ Purge ALL the necessary collections first
  const collectionsToPurge = [
    "clients",
    "projects",
    "inquiries",
    "quotations",
    "chargeSlips"
  ];

  for (const collectionName of collectionsToPurge) {
    await purgeCollection(collectionName);
  }

  // ✅ Import all collections from finalData
  for (const [collectionName, documents] of Object.entries(data)) {
    if (!Array.isArray(documents)) continue;

    console.log(`🚀 Importing ${documents.length} into ${collectionName}...`);
    for (const doc of documents) {
      try {
        let id =
          doc.id ||
          doc.clientId ||
          doc.projectId ||
          doc.inquiryId ||
          doc.referenceNumber ||
          doc.chargeSlipNo;

        if (!id) {
          console.warn(`⛔ Skipping ${collectionName} entry with missing ID key`, doc);
          continue;
        }

        const sanitized = sanitizeDoc(doc);
        await db.collection(collectionName).doc(String(id)).set(sanitized);
        console.log(`✅ Imported ${collectionName}/${id}`);
      } catch (err) {
        console.error(`❌ Failed to import ${collectionName} document:`, err.message);
      }
    }
  }

  console.log("🎉 All collections purged and imported successfully!");
}

importCollections();
// migrateFirestore.cjs
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

// Load your data
const raw = fs.readFileSync("./finalData.json", "utf-8");
const { inquiries, quotations, chargeSlips, clients, projects } = JSON.parse(raw);

// 🔧 Fix Firestore Timestamp conversion
function sanitizeValue(value) {
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    "nanoseconds" in value
  ) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return new Date(value);
  }
  return value;
}

function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const key in obj) {
      clean[key] = sanitizeObject(obj[key]);
    }
    return clean;
  }
  return sanitizeValue(obj);
}

// 🚀 Upload generic data
async function importCollection(name, data, idKey) {
  if (!data || data.length === 0) {
    console.log(`⚠️ No data found for ${name}`);
    return;
  }

  console.log(`📤 Importing ${data.length} into ${name}...`);

  for (const item of data) {
    const id = item[idKey];
    if (!id) {
      console.warn(`⛔ Skipping ${name} entry with missing ID key "${idKey}".`);
      continue;
    }

    const clean = sanitizeObject(item);
    await db.collection(name).doc(id).set(clean);
    console.log(`✅ ${name}/${id}`);
  }
}

// 🧠 Run
(async () => {
  await importCollection("inquiries", inquiries, "inquiryId");
  await importCollection("quotations", quotations, "referenceNumber");
  await importCollection("chargeSlips", chargeSlips, "chargeSlipNumber");
  await importCollection("clients", clients, "clientId");
  await importCollection("projects", projects, "projectId");

  console.log("🎉 All data successfully imported!");
})();
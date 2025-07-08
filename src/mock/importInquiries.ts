import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Adjust the path if needed
const serviceAccount = require("./serviceAccountKey.json");
const inquiries = JSON.parse(readFileSync("./src/mock/inquiries.json", "utf-8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Helper to convert custom timestamp objects
function fixTimestamps(obj: any) {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (
        obj[key] &&
        typeof obj[key] === "object" &&
        obj[key].__datatype__ === "timestamp"
      ) {
        obj[key] = Timestamp.fromDate(new Date(obj[key].value));
      } else if (typeof obj[key] === "object") {
        fixTimestamps(obj[key]);
      }
    }
  }
  return obj;
}

async function importInquiries() {
  for (const inquiry of inquiries) {
    const fixed = fixTimestamps({ ...inquiry });
    // Use Firestore auto-ID, or set your own if you have an 'id' field
    await db.collection("inquiries").add(fixed);
    console.log("Imported:", fixed.name || fixed.email);
  }
  console.log("All inquiries imported!");
}

importInquiries().catch(console.error);
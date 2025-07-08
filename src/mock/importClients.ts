const { readFileSync } = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");
const clients = JSON.parse(readFileSync("./src/mock/clients.json", "utf-8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

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

async function importClients() {
  for (const client of clients) {
    const docId = client.id || client.cid; // Use id or cid
    if (!docId) {
      console.warn("Skipping client with missing id/cid:", client);
      continue;
    }
    const fixed = fixTimestamps({ ...client });
    await db.collection("clients").doc(docId).set(fixed);
    console.log("Imported client:", docId, fixed.name || fixed.email);
  }
  console.log("All clients imported!");
}

importClients().catch(console.error);
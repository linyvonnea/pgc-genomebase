const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("./pgc-genomebase-firebase-adminsdk-fbsvc-606a85d8a7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadJSONToCollection(chargeSlips, jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

  for (const item of data) {
    if (!item.id) {
      console.log("Skipping item without ID:", item);
      continue;
    }
    //if (!Array.isArray(item.services)) item.services = [];
    //console.log(`Uploading document: ${item.id}`);

    await db.collection(chargeSlips).doc(item.id).set(item, { merge: true });
  }

  console.log("Upload complete!");
}

uploadJSONToCollection("chargeSlips", "fixed_charge_slips.json")
  .catch(console.error);

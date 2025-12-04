const admin = require("firebase-admin");
const fs = require("fs");




// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert("./pgc-genomebase-firebase-adminsdk-fbsvc-606a85d8a7.json"),
});

const db = admin.firestore();

// Load JSON data
const data = JSON.parse(fs.readFileSync("./admins_test_converted.json", "utf8"));

async function upload() {
  const collectionName = "admins";



  
  for (const item of data) {
    const docId = item.document; // use this as the document ID
    const { document, ...fields } = item; // remove the document field from inside
    await db.collection(collectionName).doc(docId).set(fields);
  console.log(`Uploaded document: ${docId}`);
 }
}

upload();

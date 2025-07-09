// Load env from .env.local
require("dotenv").config({ path: ".env.local" });

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, setDoc, doc } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

// Firebase config from .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load the JSON file
const rawData = fs.readFileSync(path.join(__dirname, "../price_catalog.json"), "utf-8");
const services = JSON.parse(rawData);

// Upload all services to Firestore
async function uploadCatalog() {
  const colRef = collection(db, "services");

  for (const item of services) {
    await setDoc(doc(colRef, item.id), item);
  }

  console.log("🎉 All services uploaded to Firestore.");
}

uploadCatalog().catch((error) => {
  console.error("Failed to upload catalog:", error);
});
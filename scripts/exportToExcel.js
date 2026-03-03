
const admin = require('firebase-admin');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Initialize with service account
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function exportCollection(collectionName) {
  console.log(`Fetching ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Flatten dates or complex objects if necessary
    const flattened = { id: doc.id };
    for (const key in data) {
      if (data[key] && typeof data[key].toDate === 'function') {
        flattened[key] = data[key].toDate().toISOString();
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        flattened[key] = JSON.stringify(data[key]);
      } else {
        flattened[key] = data[key];
      }
    }
    return flattened;
  });
}

async function run() {
  try {
    const collections = ['inquiries', 'clients', 'projects', 'quotations', 'chargeSlips'];
    const workbook = XLSX.utils.book_new();

    for (const name of collections) {
      const data = await exportCollection(name);
      if (data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      } else {
        console.log(`Collection ${name} is empty, skipping.`);
      }
    }

    const fileName = 'PGC_Database_Export.xlsx';
    XLSX.writeFile(workbook, fileName);
    console.log(`Successfully exported to ${fileName}`);
    process.exit(0);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

run();

// Script to export all clients from live Firestore to Excel, including all fields (flattened)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Firebase config (update with your actual config if needed)
const firebaseConfig = require('../src/lib/firebaseConfig.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const outputPath = path.join(__dirname, 'clients_export_live.xlsx');

async function exportClients() {
  const clientsRef = collection(db, 'clients');
  const snapshot = await getDocs(clientsRef);
  const clients = snapshot.docs.map(doc => {
    const flat = { ...doc.data() };
    flat._docId = doc.id;
    // Convert Firestore timestamp to ISO string if present
    if (flat.createdAt && typeof flat.createdAt === 'object' && flat.createdAt.seconds !== undefined) {
      flat.createdAt = new Date(flat.createdAt.seconds * 1000).toISOString();
    }
    // Convert pid array to comma-separated string
    if (Array.isArray(flat.pid)) {
      flat.pid = flat.pid.join(', ');
    }
    return flat;
  });

  const worksheet = XLSX.utils.json_to_sheet(clients);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

  XLSX.writeFile(workbook, outputPath);
  console.log(`Exported ${clients.length} clients to ${outputPath}`);
}

exportClients();

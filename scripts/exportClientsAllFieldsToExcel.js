// Script to export all clients from Firestore backup JSON to Excel, including all fields (flattened)
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Path to the most recent backup file (update if needed)
const backupPath = path.join(__dirname, '../backups/firestore-backup-2026-02-02T13-23-55-277Z/clients.json');
const outputPath = path.join(__dirname, 'clients_export_all_fields.xlsx');

const clientsRaw = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Flatten the data structure for Excel export
const clients = clientsRaw.map(entry => {
  const flat = { ...entry.data };
  flat._docId = entry.id;
  // Convert Firestore timestamp to ISO string if present
  if (flat.createdAt && typeof flat.createdAt === 'object' && flat.createdAt._seconds !== undefined) {
    flat.createdAt = new Date(flat.createdAt._seconds * 1000).toISOString();
  }
  // Convert pid array to comma-separated string
  if (Array.isArray(flat.pid)) {
    flat.pid = flat.pid.join(', ');
  }
  return flat;
});

// Convert to worksheet
const worksheet = XLSX.utils.json_to_sheet(clients);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

XLSX.writeFile(workbook, outputPath);
console.log(`Exported ${clients.length} clients to ${outputPath}`);

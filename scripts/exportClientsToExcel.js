// Script to export all clients from Firestore backup JSON to Excel
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Path to the most recent backup file (update if needed)
const backupPath = path.join(__dirname, '../backups/firestore-backup-2026-02-02T13-23-55-277Z/clients.json');
const outputPath = path.join(__dirname, 'clients_export.xlsx');

const clients = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Convert to worksheet
const worksheet = XLSX.utils.json_to_sheet(clients);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

XLSX.writeFile(workbook, outputPath);
console.log(`Exported ${clients.length} clients to ${outputPath}`);

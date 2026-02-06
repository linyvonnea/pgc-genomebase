// Script to list all projects with null/undefined/missing startDate
const fs = require('fs');
const path = require('path');

// Path to the most recent backup file (update if needed)
const backupPath = path.join(__dirname, '../backups/firestore-backup-2026-02-02T13-23-55-277Z/projects.json');

const projects = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const nullStartDateProjects = projects.filter(
  p => !p.startDate || p.startDate === null || p.startDate === undefined
);

if (nullStartDateProjects.length === 0) {
  console.log('No projects found with null startDate.');
} else {
  console.log('Projects with null startDate:');
  nullStartDateProjects.forEach(p => {
    console.log(`ID: ${p.id || ''}, PID: ${p.pid || ''}, Title: ${p.title || ''}`);
  });
}

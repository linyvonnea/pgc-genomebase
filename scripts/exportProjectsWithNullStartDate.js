// Script to export all projects with null/undefined/missing startDate to a CSV file
const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '../backups/firestore-backup-2026-02-02T13-23-55-277Z/projects.json');
const outputPath = path.join(__dirname, 'projects_with_null_startDate.csv');

const projects = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const nullStartDateProjects = projects.filter(
  p => !p.startDate || p.startDate === null || p.startDate === undefined
);

const header = ['id', 'pid', 'title', 'lead', 'status', 'sendingInstitution'];
const rows = [header.join(',')];

nullStartDateProjects.forEach(p => {
  rows.push([
    p.id || '',
    p.pid || '',
    p.title ? '"' + p.title.replace(/"/g, '""') + '"' : '',
    p.lead ? '"' + p.lead.replace(/"/g, '""') + '"' : '',
    p.status || '',
    p.sendingInstitution || ''
  ].join(','));
});

fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`Exported ${nullStartDateProjects.length} projects to ${outputPath}`);

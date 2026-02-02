#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RETENTION_DAYS = 7; // Keep backups for 7 days

function cleanupOldBackups() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    console.log('📁 No backups directory found');
    return;
  }
  
  const backups = fs.readdirSync(backupsDir)
    .filter(name => name.startsWith('firestore-backup-'))
    .map(name => ({
      name,
      path: path.join(backupsDir, name),
      timestamp: name.replace('firestore-backup-', '').replace(/T.*/, '')
    }));
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  let deletedCount = 0;
  let totalSize = 0;
  
  backups.forEach(backup => {
    try {
      const backupDate = new Date(backup.timestamp);
      
      if (backupDate < cutoffDate) {
        // Calculate size before deletion
        const stats = fs.statSync(backup.path);
        if (stats.isDirectory()) {
          const size = getDirectorySize(backup.path);
          totalSize += size;
        }
        
        // Delete backup directory
        fs.rmSync(backup.path, { recursive: true, force: true });
        deletedCount++;
        
        console.log(`🗑️  Deleted old backup: ${backup.name}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting backup ${backup.name}:`, error.message);
    }
  });
  
  console.log(`\n🧹 Cleanup completed:`);
  console.log(`   📊 Deleted: ${deletedCount} backup(s)`);
  console.log(`   💾 Space freed: ${formatBytes(totalSize)}`);
  console.log(`   🕐 Retention: ${RETENTION_DAYS} days`);
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for individual files
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run cleanup
cleanupOldBackups();
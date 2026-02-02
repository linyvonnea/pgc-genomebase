#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function restoreCollection(collectionName, backupPath) {
  try {
    console.log(`🔄 Restoring collection: ${collectionName}`);
    
    const filePath = path.join(backupPath, `${collectionName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Backup file not found for ${collectionName}, skipping...`);
      return 0;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let restored = 0;
    
    const batch = db.batch();
    const batchSize = 500; // Firestore batch limit
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batchData = data.slice(i, i + batchSize);
      
      for (const doc of batchData) {
        const docRef = db.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc.data);
      }
      
      await batch.commit();
      restored += batchData.length;
      console.log(`📝 Restored ${restored}/${data.length} documents in ${collectionName}`);
    }
    
    console.log(`✅ Successfully restored ${restored} documents to ${collectionName}`);
    return restored;
  } catch (error) {
    console.error(`❌ Error restoring ${collectionName}:`, error.message);
    return 0;
  }
}

async function restoreSubcollections(backupPath) {
  try {
    const subcollectionsPath = path.join(backupPath, 'subcollections');
    
    if (!fs.existsSync(subcollectionsPath)) {
      console.log('ℹ️  No subcollections to restore');
      return;
    }
    
    const collections = fs.readdirSync(subcollectionsPath);
    
    for (const collectionName of collections) {
      const collectionPath = path.join(subcollectionsPath, collectionName);
      const docIds = fs.readdirSync(collectionPath);
      
      for (const docId of docIds) {
        const docPath = path.join(collectionPath, docId);
        const subcollectionFiles = fs.readdirSync(docPath);
        
        for (const subcollectionFile of subcollectionFiles) {
          if (subcollectionFile.endsWith('.json')) {
            const subcollectionName = subcollectionFile.replace('.json', '');
            console.log(`🔄 Restoring subcollection: ${collectionName}/${docId}/${subcollectionName}`);
            
            const data = JSON.parse(fs.readFileSync(path.join(docPath, subcollectionFile), 'utf8'));
            
            for (const doc of data) {
              await db
                .collection(collectionName)
                .doc(docId)
                .collection(subcollectionName)
                .doc(doc.id)
                .set(doc.data);
            }
            
            console.log(`✅ Restored ${data.length} documents to ${collectionName}/${docId}/${subcollectionName}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error restoring subcollections:', error.message);
  }
}

async function listBackups() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    console.log('❌ No backups directory found');
    return [];
  }
  
  const backups = fs.readdirSync(backupsDir)
    .filter(name => name.startsWith('firestore-backup-'))
    .map(name => {
      const backupPath = path.join(backupsDir, name);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      
      let metadata = { timestamp: 'Unknown', totalDocuments: 0 };
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (error) {
          console.warn(`⚠️  Could not read metadata for ${name}`);
        }
      }
      
      return {
        name,
        path: backupPath,
        timestamp: metadata.timestamp,
        totalDocuments: metadata.totalDocuments
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return backups;
}

async function fullRestore() {
  console.log(`🔧 Firestore Restore Tool`);
  console.log(`⚠️  WARNING: This will overwrite existing data in your Firestore database!`);
  
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('❌ No backups found');
    process.exit(1);
  }
  
  console.log('\n📋 Available backups:');
  backups.forEach((backup, index) => {
    const date = new Date(backup.timestamp).toLocaleString();
    console.log(`${index + 1}. ${backup.name} (${date}) - ${backup.totalDocuments} documents`);
  });
  
  const choice = await question('\n🔢 Enter backup number to restore (or 0 to cancel): ');
  const backupIndex = parseInt(choice) - 1;
  
  if (backupIndex === -1) {
    console.log('❌ Restore cancelled');
    process.exit(0);
  }
  
  if (backupIndex < 0 || backupIndex >= backups.length) {
    console.log('❌ Invalid backup number');
    process.exit(1);
  }
  
  const selectedBackup = backups[backupIndex];
  console.log(`\n📦 Selected backup: ${selectedBackup.name}`);
  
  const confirm = await question('⚠️  Are you sure you want to restore this backup? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Restore cancelled');
    process.exit(0);
  }
  
  console.log(`\n🚀 Starting restore from ${selectedBackup.path}`);
  const startTime = Date.now();
  let totalRestored = 0;
  
  // Read backup metadata to get collection list
  const metadataPath = path.join(selectedBackup.path, 'backup-metadata.json');
  let collections = [
    'admins', 'chargeSlips', 'clients', 'inquiries', 'projects', 
    'quotations', 'roles', 'services', 'catalogSettings', 'activityLogs'
  ];
  
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    collections = metadata.collections || collections;
  }
  
  // Restore main collections
  for (const collection of collections) {
    const count = await restoreCollection(collection, selectedBackup.path);
    totalRestored += count;
  }
  
  // Restore subcollections
  await restoreSubcollections(selectedBackup.path);
  
  console.log(`\n🎉 Restore completed successfully!`);
  console.log(`📊 Total documents restored: ${totalRestored}`);
  console.log(`⏱️  Duration: ${(Date.now() - startTime) / 1000}s`);
  
  rl.close();
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Start restore
fullRestore().catch(console.error);
#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '..', 'backups', `firestore-backup-${timestamp}`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Function to get all collections dynamically
async function getAllCollections() {
  try {
    const collections = await db.listCollections();
    return collections.map(col => col.id);
  } catch (error) {
    console.error('❌ Error listing collections:', error.message);
    // Fallback to known collections if listing fails
    return [
      'admins',
      'chargeSlips',
      'clients',
      'inquiries',
      'projects', 
      'quotations',
      'roles',
      'services',
      'catalogSettings',
      'activityLogs'
    ];
  }
}

async function backupCollection(collectionName) {
  try {
    console.log(`🔄 Backing up collection: ${collectionName}`);
    
    const snapshot = await db.collection(collectionName).get();
    const data = [];
    
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    const fileName = path.join(backupDir, `${collectionName}.json`);
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully backed up ${data.length} documents from ${collectionName}`);
    return data.length;
  } catch (error) {
    console.error(`❌ Error backing up ${collectionName}:`, error.message);
    return 0;
  }
}

async function backupSubcollections(parentCollection, parentDocId, subcollections) {
  for (const subcollection of subcollections) {
    try {
      console.log(`🔄 Backing up subcollection: ${parentCollection}/${parentDocId}/${subcollection}`);
      
      const snapshot = await db
        .collection(parentCollection)
        .doc(parentDocId)
        .collection(subcollection)
        .get();
      
      const data = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id,
          data: doc.data()
        });
      });
      
      if (data.length > 0) {
        const subcollectionDir = path.join(backupDir, 'subcollections', parentCollection, parentDocId);
        if (!fs.existsSync(subcollectionDir)) {
          fs.mkdirSync(subcollectionDir, { recursive: true });
        }
        
        const fileName = path.join(subcollectionDir, `${subcollection}.json`);
        fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
        
        console.log(`✅ Successfully backed up ${data.length} documents from ${parentCollection}/${parentDocId}/${subcollection}`);
      }
    } catch (error) {
      console.error(`❌ Error backing up subcollection ${parentCollection}/${parentDocId}/${subcollection}:`, error.message);
    }
  }
}

async function fullBackup() {
  console.log(`🚀 Starting Firestore backup at ${new Date().toLocaleString()}`);
  console.log(`📁 Backup directory: ${backupDir}`);
  
  let totalDocs = 0;
  const startTime = Date.now();
  
  // Get all collections dynamically
  const collections = await getAllCollections();
  console.log(`📚 Found ${collections.length} collections to backup: ${collections.join(', ')}`);
  
  // Backup main collections
  for (const collection of collections) {
    const count = await backupCollection(collection);
    totalDocs += count;
  }
  
  // Backup known subcollections (add your subcollections here)
  try {
    // Example: backup subcollections for specific documents
    const clientsSnapshot = await db.collection('clients').get();
    for (const clientDoc of clientsSnapshot.docs) {
      await backupSubcollections('clients', clientDoc.id, ['projects', 'inquiries']);
    }
  } catch (error) {
    console.error('❌ Error backing up subcollections:', error.message);
  }
  
  // Create backup metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    totalDocuments: totalDocs,
    collections: collections,
    backupDuration: Date.now() - startTime,
    version: '1.0.0'
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'backup-metadata.json'), 
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`\n🎉 Backup completed successfully!`);
  console.log(`📊 Total documents backed up: ${totalDocs}`);
  console.log(`⏱️  Duration: ${(Date.now() - startTime) / 1000}s`);
  console.log(`📁 Location: ${backupDir}`);
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Start backup
fullBackup().catch(console.error);
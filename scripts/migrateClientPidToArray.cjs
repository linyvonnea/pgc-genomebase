// Migration script to convert client pid from string to array
// and merge projects array into pid array
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateClientPid() {
  console.log('Starting migration: Converting client pid to array...\n');
  
  try {
    const clientsSnapshot = await db.collection('clients').get();
    
    if (clientsSnapshot.empty) {
      console.log('No clients found to migrate.');
      return;
    }
    
    console.log(`Found ${clientsSnapshot.size} clients to process.\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const doc of clientsSnapshot.docs) {
      const data = doc.data();
      const cid = doc.id;
      
      // Check if pid is already an array
      if (Array.isArray(data.pid)) {
        console.log(`✓ Skipped ${cid}: pid is already an array`);
        skipped++;
        continue;
      }
      
      // Build new pid array
      let newPid = [];
      
      // Add existing pid if it's a string
      if (typeof data.pid === 'string' && data.pid.trim()) {
        newPid.push(data.pid);
      }
      
      // Add projects array if it exists
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        // Filter out duplicates and add to newPid
        data.projects.forEach(project => {
          if (project && !newPid.includes(project)) {
            newPid.push(project);
          }
        });
      }
      
      // Prepare update data
      const updateData = {
        pid: newPid,
        projects: admin.firestore.FieldValue.delete() // Remove projects field
      };
      
      batch.update(doc.ref, updateData);
      batchCount++;
      migrated++;
      
      console.log(`✓ Migrated ${cid}: pid = [${newPid.join(', ')}]`);
      
      // Commit batch every 500 documents
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n--- Committed batch of ${batchCount} documents ---\n`);
        batchCount = 0;
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n--- Committed final batch of ${batchCount} documents ---\n`);
    }
    
    console.log('\n========================================');
    console.log('Migration Summary:');
    console.log(`Total clients: ${clientsSnapshot.size}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped (already migrated): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('========================================\n');
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateClientPid()
  .then(() => {
    console.log('\nExiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

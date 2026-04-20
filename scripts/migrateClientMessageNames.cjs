/**
 * Migration Script: Update Chat Message Sender Names
 * 
 * This script updates existing chat messages where the senderRole is 'client'
 * to use the client's full name from the corresponding quotationThread.
 * This ensures that badge initials (e.g., "JT" for Jayne Tolentino) are 
 * correctly generated from the actual name instead of the email address.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Load service account
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateMessageSenderNames() {
  console.log('--- Starting Migration: Update Client Message Sender Names ---');
  
  try {
    // 1. Fetch all quotation threads to get a mapping of threadId -> clientName
    console.log('Fetching quotation threads...');
    const threadsSnap = await db.collection('quotationThreads').get();
    const threadMap = new Map();
    
    threadsSnap.forEach(doc => {
      const data = doc.data();
      if (data.clientName) {
        threadMap.set(doc.id, data.clientName);
      }
    });
    console.log(`Loaded ${threadMap.size} threads with client names.`);

    // 2. Fetch all messages where senderRole is 'client'
    console.log('Fetching client messages...');
    const messageCollection = 'threadMessages';
    const messagesSnap = await db.collection(messageCollection)
      .where('senderRole', '==', 'client')
      .get();
    
    console.log(`Found ${messagesSnap.size} client messages to review.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const batchSize = 400;
    let batch = db.batch();
    let countInBatch = 0;

    for (const messageDoc of messagesSnap.docs) {
      const msgData = messageDoc.data();
      const threadId = msgData.threadId;
      const currentSenderName = msgData.senderName;
      const correctName = threadMap.get(threadId);

      // If we have a correct name and it differs from the current one (or current is likely an email)
      if (correctName && currentSenderName !== correctName) {
        batch.update(messageDoc.ref, { senderName: correctName });
        updatedCount++;
        countInBatch++;

        if (countInBatch >= batchSize) {
          await batch.commit();
          batch = db.batch();
          countInBatch = 0;
          console.log(`Committed batch... (${updatedCount} updated so far)`);
        }
      } else {
        skippedCount++;
      }
    }

    if (countInBatch > 0) {
      await batch.commit();
    }

    console.log('\n--- Migration Complete ---');
    console.log(`Successfully updated: ${updatedCount} messages`);
    console.log(`Skipped (already correct or no thread name): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateMessageSenderNames();

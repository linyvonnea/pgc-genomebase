const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKeyE.json");

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function importData() {
  try {
    // Read the converted JSON file
    const allData = JSON.parse(fs.readFileSync('inquiriesDB.json', 'utf8'));
    
    // Take only the first 5 records
    const data = allData.slice(0, 5);
    
    console.log(`Importing first ${data.length} records out of ${allData.length} total records...`);
    
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;
    
    for (const item of data) {
      // Skip items that don't have required fields or are incomplete
      if (!item.name && !item.affiliation) {
        console.log('Skipping incomplete item:', item);
        continue;
      }
      
      // Fix timestamp conversion to preserve original dates
      if (item.createdAt) {
        if (typeof item.createdAt === 'string') {
          // If createdAt is a string (ISO format), convert it to Firestore Timestamp
          const date = new Date(item.createdAt);
          if (!isNaN(date.getTime())) {
            item.createdAt = Timestamp.fromDate(date);
          } else {
            // If date is invalid, use current time as fallback
            item.createdAt = Timestamp.now();
          }
        } else if (item.createdAt._seconds) {
          // If createdAt already has Firestore timestamp format
          item.createdAt = Timestamp.fromMillis(item.createdAt._seconds * 1000);
        } else {
          // Set default timestamp if format is unrecognized
          item.createdAt = Timestamp.now();
        }
      } else {
        // Set default timestamp if missing
        item.createdAt = Timestamp.now();
      }
      
      // Fix status values - ensure proper status values
      if (!item.status || item.status === "null" || item.status === null) {
        item.status = "Pending";
      }
      
      // Convert other null/undefined fields to proper defaults
      Object.keys(item).forEach(key => {
        if (item[key] === "null" || item[key] === null || item[key] === undefined || item[key] === "") {
          if (key === 'isApproved') {
            item[key] = false;
          } else if (key === 'status') {
            item[key] = "Pending";
          } else if (key === 'email') {
            item[key] = undefined; // Keep email as undefined if not provided
          } else {
            item[key] = "";
          }
        }
        
        // Convert string booleans to actual booleans
        if (key === 'isApproved') {
          if (item[key] === "true") item[key] = true;
          if (item[key] === "false") item[key] = false;
        }
      });
      
      // Generate a document ID
      const docRef = db.collection('inquiries').doc();
      batch.set(docRef, item);
      
      count++;
      batchCount++;
      
      console.log(`Prepared record ${count}: ${item.name} - Status: ${item.status}`);
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`Imported ${count} documents...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully imported ${count} documents to Firestore!`);

  } catch (error) {
    console.error('Error importing data:', error);
  }
}

importData();
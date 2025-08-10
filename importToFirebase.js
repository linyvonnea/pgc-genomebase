const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKeyE.json");

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function purgeCollection() {
  console.log('Purging existing data from inquiries collection...');
  
  const collectionRef = db.collection('inquiries');
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log('No existing data to purge.');
    return;
  }
  
  console.log(`Found ${snapshot.size} existing documents to delete...`);
  
  let batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    count++;
    
    if (count % 500 === 0) {
      batch.commit();
      batch = db.batch();
    }
  });
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`Purged ${count} existing documents.`);
}

async function importData() {
  try {
    // First purge existing data
    await purgeCollection();
    
    // Read the converted JSON file
    const allData = JSON.parse(fs.readFileSync('inquiriesDB.json', 'utf8'));
    
    // Import all data instead of just first 5
    const data = allData;
    
    console.log(`Importing all ${data.length} records...`);
    
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;
    
    for (const item of data) {
      // Skip items that don't have required fields or are incomplete
      if (!item.name && !item.affiliation) {
        console.log('Skipping incomplete item:', item);
        continue;
      }
      
      // Handle email field - be more permissive with email values
      if (item.email === null || item.email === undefined || item.email === "null") {
        item.email = "N/A";
      } else if (typeof item.email === 'string') {
        // Keep the email as-is if it's a string, even if it's empty or "N/A"
        item.email = item.email.trim();
      } else {
        // For any other data type, convert to string
        item.email = String(item.email);
      }
      
      // Fix timestamp conversion first, before processing other fields
      if (item.createdAt) {
        if (typeof item.createdAt === 'string') {
          // If createdAt is a string (ISO format), convert it to Firestore Timestamp
          const date = new Date(item.createdAt);
          if (!isNaN(date.getTime())) {
            item.createdAt = Timestamp.fromDate(date);
          } else {
            // If date is invalid, use current time as fallback
            console.log(`Invalid date for record ${item.name || 'Unknown'}: ${item.createdAt}, using current time`);
            item.createdAt = Timestamp.now();
          }
        } else if (item.createdAt._seconds) {
          // If createdAt already has Firestore timestamp format
          item.createdAt = Timestamp.fromMillis(item.createdAt._seconds * 1000);
        } else {
          // Set default timestamp if format is unrecognized
          console.log(`Unrecognized date format for record ${item.name || 'Unknown'}: ${item.createdAt}, using current time`);
          item.createdAt = Timestamp.now();
        }
      } else {
        // Set default timestamp if missing
        item.createdAt = Timestamp.now();
      }
      
      // Fix status values - ensure proper status values
      if (!item.status || item.status === "null" || item.status === null || item.status === undefined || item.status === "") {
        item.status = "Pending";
      }
      
      // Convert other null/undefined fields to proper defaults (skip email, createdAt, and status as they're handled above)
      Object.keys(item).forEach(key => {
        // Skip fields already processed
        if (key === 'email' || key === 'createdAt' || key === 'status') return;
        
        if (item[key] === "null" || item[key] === null || item[key] === undefined || item[key] === "") {
          if (key === 'isApproved') {
            item[key] = false;
          } else {
            item[key] = "";
          }
        }
        
        // Convert string booleans to actual booleans
        if (key === 'isApproved') {
          if (item[key] === "true") item[key] = true;
          if (item[key] === "false") item[key] = false;
          if (typeof item[key] !== 'boolean') item[key] = false;
        }
      });
      
      // Generate a document ID
      const docRef = db.collection('inquiries').doc();
      batch.set(docRef, item);
      
      count++;
      batchCount++;
      
      console.log(`Prepared record ${count}: ${item.name || 'No name'} - Status: ${item.status} - Email: ${item.email} - Created: ${item.createdAt ? 'Valid' : 'Invalid'}`);
      
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
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  console.log('Fetching inquiries with status "Pending"...');
  const snapshot = await db.collection('inquiries').where('status', '==', 'Pending').get();
  
  if (snapshot.empty) {
    console.log('No pending inquiries found.');
    process.exit(0);
    return;
  }

  console.log(`Found ${snapshot.size} pending inquiries. Updating to "Quotation Only"...`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    batch.update(doc.ref, { 
      status: 'Quotation Only',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    count++;
    
    // Firestore batch limit is 500
    if (count % 500 === 0) {
      console.log(`Batched ${count} updates...`);
    }
  });

  await batch.commit();
  console.log(`Successfully updated ${count} inquiries to "Quotation Only".`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error during bulk update:', err);
  process.exit(1);
});

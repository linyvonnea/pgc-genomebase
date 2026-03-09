
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkInquiries() {
  console.log('Checking inquiries for hasLoggedIn and hasOpenedQuotation fields...');
  const snapshot = await db.collection('inquiries').get();
  
  if (snapshot.empty) {
    console.log('No inquiries found.');
    return;
  }

  let found = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.hasLoggedIn || data.hasOpenedQuotation) {
      console.log(`Inquiry ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  hasLoggedIn: ${data.hasLoggedIn}`);
      console.log(`  hasOpenedQuotation: ${data.hasOpenedQuotation}`);
      found++;
    }
  });

  if (found === 0) {
    console.log('No inquiries found with these fields set to true.');
    
    // Check if fields exist at all
    const firstDoc = snapshot.docs[0].data();
    console.log('\nSchema check on first document:');
    console.log(`  hasLoggedIn exists: ${'hasLoggedIn' in firstDoc}`);
    console.log(`  hasOpenedQuotation exists: ${'hasOpenedQuotation' in firstDoc}`);
  } else {
    console.log(`\nFound ${found} inquiries with activity indicators.`);
  }
}

checkInquiries().catch(console.error);

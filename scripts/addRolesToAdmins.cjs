/**
 * Migration Script: Add roles to all admin users in Firestore
 * 
 * This script adds the 'role' field to all existing admin documents
 * that don't have one. Default role is 'admin'.
 * 
 * Usage: node scripts/addRolesToAdmins.cjs
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function addRolesToAdmins() {
  console.log("🔄 Starting admin role migration...\n");

  try {
    // Get all admin documents
    const adminsRef = db.collection("admins");
    const snapshot = await adminsRef.get();

    if (snapshot.empty) {
      console.log("❌ No admin documents found.");
      return;
    }

    console.log(`📋 Found ${snapshot.size} admin documents.\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each admin document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const email = doc.id;

      // Check if role already exists
      if (data.role) {
        console.log(`⏭️  ${email} - Already has role: ${data.role}`);
        skippedCount++;
        continue;
      }

      // Add default role
      // You can customize the default role here:
      // - "superadmin" for full access
      // - "admin" for most operations (recommended default)
      // - "moderator" for limited operations
      // - "viewer" for read-only
      
      const defaultRole = "admin"; // Change this if needed

      await adminsRef.doc(email).update({
        role: defaultRole,
      });

      console.log(`✅ ${email} - Added role: ${defaultRole}`);
      updatedCount++;
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✨ Migration completed!`);
    console.log(`   Updated: ${updatedCount} admins`);
    console.log(`   Skipped: ${skippedCount} admins (already had role)`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
addRolesToAdmins()
  .then(() => {
    console.log("\n✅ Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

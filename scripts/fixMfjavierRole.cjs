/**
 * Fix Script: Update mfjavier role from "super-admin" to "superadmin"
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixMfjavierRole() {
  console.log("🔄 Fixing mfjavier@up.edu.ph role...\n");

  try {
    const email = "mfjavier@up.edu.ph";
    const adminRef = db.collection("admins").doc(email);
    const doc = await adminRef.get();

    if (!doc.exists) {
      console.log("❌ Admin not found.");
      return;
    }

    const currentRole = doc.data().role;
    console.log(`Current role: ${currentRole}`);

    if (currentRole === "super-admin") {
      await adminRef.update({
        role: "superadmin",
      });
      console.log(`✅ Updated role from "super-admin" to "superadmin"`);
    } else {
      console.log(`⏭️  Role is already correct: ${currentRole}`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixMfjavierRole()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

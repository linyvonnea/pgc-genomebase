/**
 * Script to synchronize project.clientNames array from the clients collection
 * This ensures the projects table displays all associated client names correctly.
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function syncClientNames() {
  console.log("🚀 Starting synchronization of project clientNames...");
  
  try {
    // 1. Get all projects
    const projectsSnapshot = await db.collection("projects").get();
    console.log(`Found ${projectsSnapshot.size} projects to check.`);

    let updatedCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const pid = projectData.pid || projectDoc.id;
      const currentNames = projectData.clientNames || [];

      // 2. Find all clients associated with this project PID
      // PID can be a string or an array of strings in client records
      const clientsSnapshot = await db.collection("clients")
        .where("pid", "array-contains", pid)
        .get();
      
      const actualNames = clientsSnapshot.docs
        .map(doc => doc.data().name)
        .filter(name => name && name.trim() !== "");

      // 3. Compare and update if necessary
      const needsUpdate = actualNames.length !== currentNames.length || 
                          actualNames.some(name => !currentNames.includes(name));

      if (needsUpdate) {
        console.log(`Updating project ${pid}: ${currentNames.join(", ")} -> ${actualNames.join(", ")}`);
        await projectDoc.ref.update({
          clientNames: actualNames,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    }

    console.log(`✅ Synchronization complete. Updated ${updatedCount} projects.`);
  } catch (error) {
    console.error("❌ Sync failed:", error);
  } finally {
    process.exit(0);
  }
}

syncClientNames();

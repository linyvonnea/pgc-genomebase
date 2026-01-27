/**
 * Update Role Permissions in Firestore
 * This script updates the rolePermissions collection with the latest default permissions
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const DEFAULT_ROLE_PERMISSIONS = {
  viewer: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    quotations: { view: true, create: false, edit: false, delete: false },
    chargeSlips: { view: true, create: false, edit: false, delete: false },
    manualQuotation: { view: false, create: false, edit: false, delete: false },
    serviceCatalog: { view: true, create: false, edit: false, delete: false },
    catalogSettings: { view: false, create: false, edit: false, delete: false },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    roleManagement: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: false, create: false, edit: false, delete: false },
  },
  moderator: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    quotations: { view: true, create: true, edit: true, delete: false },
    chargeSlips: { view: true, create: true, edit: true, delete: false },
    manualQuotation: { view: true, create: true, edit: false, delete: false },
    serviceCatalog: { view: true, create: false, edit: false, delete: false },
    catalogSettings: { view: false, create: false, edit: false, delete: false },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    roleManagement: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: false, create: false, edit: false, delete: false },
  },
  admin: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    quotations: { view: true, create: true, edit: true, delete: true },
    chargeSlips: { view: true, create: true, edit: true, delete: true },
    manualQuotation: { view: true, create: true, edit: true, delete: false },
    serviceCatalog: { view: true, create: true, edit: true, delete: true },
    catalogSettings: { view: true, create: true, edit: true, delete: true },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    roleManagement: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: true, create: false, edit: false, delete: false },
  },
  superadmin: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    quotations: { view: true, create: true, edit: true, delete: true },
    chargeSlips: { view: true, create: true, edit: true, delete: true },
    manualQuotation: { view: true, create: true, edit: true, delete: true },
    serviceCatalog: { view: true, create: true, edit: true, delete: true },
    catalogSettings: { view: true, create: true, edit: true, delete: true },
    usersPermissions: { view: true, create: true, edit: true, delete: true },
    roleManagement: { view: true, create: false, edit: true, delete: false },
    activityLogs: { view: true, create: false, edit: false, delete: true },
  },
};

async function updateRolePermissions() {
  try {
    console.log("🔄 Updating role permissions in Firestore...\n");

    const roles = ["viewer", "moderator", "admin", "superadmin"];

    for (const role of roles) {
      const roleRef = db.collection("rolePermissions").doc(role);
      const permissions = DEFAULT_ROLE_PERMISSIONS[role];

      await roleRef.set(
        {
          ...permissions,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: "migration-script",
        },
        { merge: true }
      );

      console.log(`✅ Updated permissions for role: ${role}`);
      console.log(`   - Service Catalog Create: ${permissions.serviceCatalog.create}`);
      console.log(`   - Role Management View: ${permissions.roleManagement.view}`);
      console.log("");
    }

    console.log("✅ All role permissions updated successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Admin role: serviceCatalog.create = true");
    console.log("   - Admin role: roleManagement = all false");
    console.log("   - Only Superadmin can access Role Management");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating role permissions:", error);
    process.exit(1);
  }
}

updateRolePermissions();

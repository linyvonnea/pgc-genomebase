#!/usr/bin/env node

/*
 * Backfill inquiry uuid values from Firebase Authentication users.
 *
 * Usage:
 *   node scripts/backfill-inquiry-uuids.cjs
 *   node scripts/backfill-inquiry-uuids.cjs --dry-run
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
// eslint-disable-next-line import/no-dynamic-require, global-require
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const DRY_RUN = process.argv.includes("--dry-run");

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function main() {
  console.log("\nStarting inquiry UUID backfill...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const inquiriesSnap = await db.collection("inquiries").get();
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  const batch = db.batch();
  let pendingWrites = 0;

  for (const docSnap of inquiriesSnap.docs) {
    scanned += 1;
    const data = docSnap.data() || {};
    const email = normalizeEmail(data.email);
    const existingUuid = typeof data.uuid === "string" ? data.uuid.trim() : "";

    if (!email) {
      skipped += 1;
      continue;
    }

    if (existingUuid) {
      skipped += 1;
      continue;
    }

    let uid = "";
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord?.uid || "";
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.warn(`Unable to resolve auth user for ${email}:`, error);
      }
    }

    if (!uid) {
      missing += 1;
    }

    if (!DRY_RUN) {
      batch.update(docSnap.ref, { uuid: uid });
      pendingWrites += 1;
      updated += 1;
    }

    if (!DRY_RUN && pendingWrites >= 450) {
      await batch.commit();
      pendingWrites = 0;
      // Create a fresh batch after committing the previous one.
      // eslint-disable-next-line no-global-assign
      batch = db.batch();
    }
  }

  if (!DRY_RUN && pendingWrites > 0) {
    await batch.commit();
  }

  console.log("\nBackfill summary:");
  console.log(`- scanned: ${scanned}`);
  console.log(`- updated: ${updated}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- missing-auth-match: ${missing}`);
  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Inquiry UUID backfill failed:", error);
  process.exit(1);
});

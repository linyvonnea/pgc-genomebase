#!/usr/bin/env node

/*
 * Backfill uuid values for existing inquiry documents using the users collection.
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

async function loadEmailToUidMap() {
  const usersSnap = await db.collection("users").get();
  const map = new Map();

  usersSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const uid =
      typeof data.uid === "string" && data.uid ? data.uid : docSnap.id;
    const email = normalizeEmail(data.email);
    if (uid && email) {
      map.set(email, uid);
    }
  });

  return map;
}

async function main() {
  console.log("\nStarting inquiry UUID backfill...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const emailToUid = await loadEmailToUidMap();
  console.log(
    `Loaded ${emailToUid.size} email->uid mappings from users collection.`,
  );

  const snap = await db.collection("inquiries").get();
  let scanned = 0;
  let patched = 0;
  let skipped = 0;

  const batch = db.batch();
  let pendingWrites = 0;

  for (const docSnap of snap.docs) {
    scanned += 1;
    const data = docSnap.data() || {};
    const email = normalizeEmail(data.email);

    if (!email || data.uuid) {
      skipped += 1;
      continue;
    }

    const uid = emailToUid.get(email);
    if (!uid) {
      skipped += 1;
      continue;
    }

    patched += 1;
    if (!DRY_RUN) {
      batch.update(docSnap.ref, { uuid: uid });
      pendingWrites += 1;
    }

    if (!DRY_RUN && pendingWrites >= 450) {
      await batch.commit();
      pendingWrites = 0;
    }
  }

  if (!DRY_RUN && pendingWrites > 0) {
    await batch.commit();
  }

  console.log("\nBackfill summary:");
  console.log(`- scanned=${scanned}`);
  console.log(`- patched=${patched}`);
  console.log(`- skipped=${skipped}`);
  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Inquiry UUID backfill failed:", error);
  process.exit(1);
});

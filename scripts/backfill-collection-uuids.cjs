#!/usr/bin/env node

/*
 * Backfill uuid values for quotation and charge-slip documents using the users collection.
 *
 * Usage:
 *   node scripts/backfill-collection-uuids.cjs
 *   node scripts/backfill-collection-uuids.cjs --dry-run
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

async function loadEmailToUuidMap() {
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

async function updateDocs(collectionName, mapper) {
  const snap = await db.collection(collectionName).get();
  let scanned = 0;
  let patched = 0;

  const batch = db.batch();
  let pendingWrites = 0;

  for (const docSnap of snap.docs) {
    scanned += 1;
    const updates = mapper(docSnap);
    if (!updates || Object.keys(updates).length === 0) continue;

    patched += 1;
    if (!DRY_RUN) {
      batch.update(docSnap.ref, updates);
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

  return { collectionName, scanned, patched };
}

async function main() {
  console.log("\nStarting collection UUID backfill...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const emailToUuid = await loadEmailToUuidMap();
  console.log(
    `Loaded ${emailToUuid.size} email->uid mappings from users collection.`,
  );

  const results = [];

  results.push(
    await updateDocs("quotations", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.uuid) return null;
      const email = normalizeEmail(data.email || data.clientInfo?.email);
      const uid = emailToUuid.get(email);
      return uid ? { uuid: uid } : null;
    }),
  );

  results.push(
    await updateDocs("chargeSlips", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.uuid) return null;
      const email = normalizeEmail(
        data.clientInfo?.email || data.client?.email,
      );
      const uid = emailToUuid.get(email);
      return uid ? { uuid: uid } : null;
    }),
  );

  console.log("\nBackfill summary:");
  for (const row of results) {
    console.log(
      `- ${row.collectionName}: scanned=${row.scanned}, patched=${row.patched}`,
    );
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Collection UUID backfill failed:", error);
  process.exit(1);
});

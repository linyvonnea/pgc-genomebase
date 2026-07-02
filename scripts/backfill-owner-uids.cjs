#!/usr/bin/env node

/*
 * Backfill uid-based ownership fields for existing Firestore documents.
 *
 * Usage:
 *   npm run backfill-owner-uids
 *   npm run backfill-owner-uids -- --dry-run
 *
 * Requirements:
 *   - scripts/serviceAccountKey.json must exist.
 *   - users collection should contain docs keyed by uid with an email field.
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
      // Keep margin below Firestore batch limit (500)
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
  console.log("\\nStarting owner uid backfill...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const emailToUid = await loadEmailToUidMap();
  console.log(
    `Loaded ${emailToUid.size} email->uid mappings from users collection.`,
  );

  const results = [];

  results.push(
    await updateDocs("officeCalendar", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.createdByUid) return null;
      const uid = emailToUid.get(normalizeEmail(data.createdBy));
      return uid ? { createdByUid: uid } : null;
    }),
  );

  results.push(
    await updateDocs("inquiries", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.ownerUid) return null;
      const uid = emailToUid.get(normalizeEmail(data.email));
      return uid ? { ownerUid: uid } : null;
    }),
  );

  results.push(
    await updateDocs("quotationThreads", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.clientUid) return null;
      const uid = emailToUid.get(normalizeEmail(data.clientEmail));
      return uid ? { clientUid: uid } : null;
    }),
  );

  results.push(
    await updateDocs("threadMessages", (docSnap) => {
      const data = docSnap.data() || {};
      if (data.senderUid) return null;
      const senderId = normalizeEmail(data.senderId);
      if (!senderId || !senderId.includes("@")) return null;
      const uid = emailToUid.get(senderId);
      return uid ? { senderUid: uid } : null;
    }),
  );

  results.push(
    await updateDocs("clientConformes", (docSnap) => {
      const data = docSnap.data() || {};
      const root = data.data || {};
      if (root.createdByUid) return null;
      const uid = emailToUid.get(normalizeEmail(root.createdBy));
      return uid ? { "data.createdByUid": uid } : null;
    }),
  );

  console.log("\\nBackfill summary:");
  for (const row of results) {
    console.log(
      `- ${row.collectionName}: scanned=${row.scanned}, patched=${row.patched}`,
    );
  }

  console.log("\\nDone.");
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});

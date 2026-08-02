#!/usr/bin/env node

/*
 * Backfill uuid values for projects using linked inquiry IDs (iid -> inquiries.uuid).
 *
 * Usage:
 *   node scripts/backfill-project-uuids.cjs
 *   node scripts/backfill-project-uuids.cjs --dry-run
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

function toInquiryIds(iid) {
  if (Array.isArray(iid)) {
    return iid.filter(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
  }
  if (typeof iid === "string" && iid.trim().length > 0) {
    return [iid];
  }
  return [];
}

async function loadInquiryUuidMap() {
  const map = new Map();
  const inquiriesSnap = await db.collection("inquiries").get();

  inquiriesSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const uuid = typeof data.uuid === "string" && data.uuid ? data.uuid : null;
    if (uuid) {
      map.set(docSnap.id, uuid);
    }
  });

  return map;
}

async function main() {
  console.log("\nStarting project UUID backfill...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);

  const inquiryUuidMap = await loadInquiryUuidMap();
  console.log(`Loaded ${inquiryUuidMap.size} inquiry->uuid mappings.`);

  const projectsSnap = await db.collection("projects").get();
  let scanned = 0;
  let patched = 0;
  let skipped = 0;

  const batch = db.batch();
  let pendingWrites = 0;

  for (const docSnap of projectsSnap.docs) {
    scanned += 1;
    const data = docSnap.data() || {};
    const inquiryIds = toInquiryIds(data.iid);

    if (inquiryIds.length === 0) {
      skipped += 1;
      continue;
    }

    let resolvedUuid = null;
    for (const inquiryId of inquiryIds) {
      const uuid = inquiryUuidMap.get(inquiryId);
      if (uuid) {
        resolvedUuid = uuid;
        break;
      }
    }

    if (!resolvedUuid) {
      skipped += 1;
      continue;
    }

    const currentUuid = typeof data.uuid === "string" ? data.uuid : null;
    if (currentUuid === resolvedUuid) {
      skipped += 1;
      continue;
    }

    patched += 1;
    if (!DRY_RUN) {
      batch.update(docSnap.ref, { uuid: resolvedUuid });
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
  console.error("Project UUID backfill failed:", error);
  process.exit(1);
});

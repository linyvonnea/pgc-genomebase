// rename_and_patch_quote.cjs
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccount.json");

/**
 * Usage:
 * node rename_and_patch_quote.cjs \
 *   quotations/VMENF-Q-2025-00X \
 *   quotations/VMENF-Q-2021-003 \
 *   ./VMENF-Q-2021-003_items.json \
 *   2021-05-12 \
 *   --internal \
 *   --discount-scope=all \
 *   --delete-old
 */
const [oldPath, newPath, itemsPath, dateIssuedArg, ...flags] = process.argv.slice(2);
if (!oldPath || !newPath || !itemsPath || !dateIssuedArg) {
  console.error("Usage: node rename_and_patch_quote.cjs <oldDocPath> <newDocPath> <items.json> <YYYY-MM-DD> [--internal] [--discount-scope=equipment|all] [--delete-old]");
  process.exit(1);
}

const IS_INTERNAL = flags.includes("--internal");
const DELETE_OLD = flags.includes("--delete-old");
const scopeFlag = flags.find(f => f.startsWith("--discount-scope="));
const DISCOUNT_SCOPE = scopeFlag ? scopeFlag.split("=")[1] : "equipment"; // "equipment" | "all"

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const isEquipment = (l) =>
  (l.type && l.type.toLowerCase() === "equipment") || /equipment/i.test(l.category || "");

async function copySubcollections(oldRef, newRef) {
  const subs = await oldRef.listCollections();
  for (const sub of subs) {
    const snap = await sub.get();
    for (const doc of snap.docs) {
      await newRef.collection(sub.id).doc(doc.id).set(doc.data());
    }
  }
}

async function run() {
  const oldRef = db.doc(oldPath);
  const newRef = db.doc(newPath);

  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) {
    console.error("❌ Old document not found:", oldPath);
    process.exit(1);
  }
  const base = oldSnap.data();

  const services = JSON.parse(fs.readFileSync(path.resolve(itemsPath), "utf8"));

  const equipmentSubtotal = r2(
    services.filter(isEquipment).reduce((s, l) => s + (l.price ?? 0) * (l.quantity ?? 0), 0)
  );
  const nonEquipmentSubtotal = r2(
    services.filter((l) => !isEquipment(l)).reduce((s, l) => s + (l.price ?? 0) * (l.quantity ?? 0), 0)
  );
  const combinedSubtotal = r2(equipmentSubtotal + nonEquipmentSubtotal);

  const discountRate = IS_INTERNAL ? 0.12 : 0;
  const discountBase =
    DISCOUNT_SCOPE === "all" ? combinedSubtotal : equipmentSubtotal;

  const equipmentDiscount = r2((DISCOUNT_SCOPE === "equipment" ? discountBase : equipmentSubtotal) * discountRate);
  const combinedDiscount = r2(discountBase * discountRate);

  // Grand total according to selected scope
  const grandTotal =
    DISCOUNT_SCOPE === "all"
      ? r2(combinedSubtotal - combinedDiscount)
      : r2(equipmentSubtotal - equipmentDiscount + nonEquipmentSubtotal);

  const newId = newPath.split("/").pop();
  const payload = {
    ...base,
    referenceNumber: newId,
    services,
    isInternal: IS_INTERNAL,
    discountRate,
    // Store both for transparency
    equipmentSubtotal,
    reagentsSubtotal: nonEquipmentSubtotal,
    subtotal: combinedSubtotal,
    equipmentDiscount: DISCOUNT_SCOPE === "equipment" ? combinedDiscount : equipmentDiscount, // keep field name for UI
    discountAppliedOn: DISCOUNT_SCOPE, // "equipment" | "all"
    equipmentTotalAfterDiscount:
      DISCOUNT_SCOPE === "equipment"
        ? r2(equipmentSubtotal - combinedDiscount)
        : r2(equipmentSubtotal - equipmentDiscount),
    grandTotal,
    dateIssued: Timestamp.fromDate(new Date(dateIssuedArg)),
    notes:
      base?.notes ||
      `Migrated from legacy quotation (discount on ${DISCOUNT_SCOPE}).`,
  };

  await newRef.set(payload, { merge: false });
  await copySubcollections(oldRef, newRef);

  if (DELETE_OLD) await oldRef.delete();

  console.log("✅ Renamed & patched:");
  console.log("   from:", oldPath);
  console.log("   to  :", newPath);
  console.log({
    equipmentSubtotal,
    nonEquipmentSubtotal,
    combinedSubtotal,
    discountScope: DISCOUNT_SCOPE,
    discount: combinedDiscount,
    grandTotal,
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
// patch_quote.cjs
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccount.json");

// ---- EDIT THIS to your doc path ----
const DOC_PATH = "quotations/VMENF-Q-2025-1"; // collection/docId

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Helper for 2-decimal rounding (to avoid 2107.5200000001, etc.)
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function run() {
  // ===== Services to write (legacy 2020 rates) =====
  const services = [
    // Equipment Use (old rates)
    {
      category: "Equipment Use (Without Consumables)",
      id: "EQP-SVC-032",
      name: "Standard Minifuge (DLab D1008)",
      price: 91,
      quantity: 12,
      type: "equipment",
      unit: "per hour",
    },
    {
      category: "Equipment Use (Without Consumables)",
      id: "EQP-SVC-021",
      name: "Micropipette (Multichannel)",
      price: 101,
      quantity: 28, // 28 hrs to match the sheet subtotal
      type: "equipment",
      unit: "per hour",
    },
    {
      category: "Equipment Use (Without Consumables)",
      id: "EQP-SVC-023",
      name: "Microwave Spectrophotometry (Multiskan Sky, uDrop)",
      price: 305,
      quantity: 8,
      type: "equipment",
      unit: "per hour",
    },
    {
      category: "Equipment Use (Without Consumables)",
      id: "EQP-SVC-010",
      name: "Electrophoresis System (Advance Mupid One)",
      price: 154,
      quantity: 16,
      type: "equipment",
      unit: "per hour",
    },
    {
      category: "Equipment Use (Without Consumables)",
      id: "EQP-SVC-015",
      name: "Gradient Thermal Cycler (Bio-Rad T100)",
      price: 261,
      quantity: 8,
      type: "equipment",
      unit: "per hour",
    },

    // Reagents & Consumables (custom lines; id = null)
    { category: "Reagents and Consumables", id: null, name: "Extraction Kit (50 samples/kit)",           price: 52000,   quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "Absolute Ethanol (2 × 2.5 L)",             price: 380,     quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "RNase-free water",                          price: 703,     quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "Tips & Tubes (extraction)",                 price: 9000,    quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "Agarose gel",                               price: 384,     quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "Nucleic acid stain (Gel Red)",              price: 2107.52, quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Reagents and Consumables", id: null, name: "Tips & Tubes (quantification)",             price: 6000,    quantity: 1, type: "retail",     unit: "lot (for 96 samples)" },
    { category: "Sequencing (c/o PGC HQ)", id: null, name: "Purification",                               price: 30720,   quantity: 1, type: "laboratory", unit: "lot (for 96 samples)" },
    { category: "Sequencing (c/o PGC HQ)", id: null, name: "Forward & reverse sequencing",               price: 48000,   quantity: 1, type: "laboratory", unit: "lot (for 96 samples)" },
  ];

  // Compute totals (same logic as old sheet)
  const equipmentSubtotal = r2(
    services
      .filter((s) => s.type === "equipment")
      .reduce((sum, s) => sum + s.price * s.quantity, 0)
  );
  const discountRate = 0.12; // internal
  const equipmentDiscount = r2(equipmentSubtotal * discountRate);
  const reagentsSubtotal = r2(
    services
      .filter((s) => s.type !== "equipment")
      .reduce((sum, s) => sum + s.price * s.quantity, 0)
  );
  const equipmentTotalAfterDiscount = r2(equipmentSubtotal - equipmentDiscount);
  const grandTotal = r2(equipmentTotalAfterDiscount + reagentsSubtotal);

  console.log({ equipmentSubtotal, equipmentDiscount, reagentsSubtotal, equipmentTotalAfterDiscount, grandTotal });

  // Sanity check (should be 158,897.08)
  if (grandTotal !== 158897.08) {
    console.warn("⚠️ Totals differ from the legacy sheet. Proceeding anyway.");
  }

  await db.doc(DOC_PATH).update({
    services,
    isInternal: true,
    discountRate,
    equipmentSubtotal,
    equipmentDiscount,
    equipmentTotalAfterDiscount,
    reagentsSubtotal,
    grandTotal,
    notes: "Migrated from 2020 Excel (Equipment + Reagents)."
  });

  console.log("✅ Firestore updated:", DOC_PATH);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
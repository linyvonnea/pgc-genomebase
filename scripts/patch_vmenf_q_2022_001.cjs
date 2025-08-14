// scripts/patch_vmenf_q_2022_001.cjs
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const sa = require("../serviceAccount.json");

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const FIX = {
  "Autoclave (ALPC-32L)": { price: 223, quantity: 3 },
  "Electrophoresis System (Advance Mujid One)": { price: 154, quantity: 1 },
  "Shaker Incubator (Heidolph)": { price: 202, quantity: 1 },
};

(async () => {
  const ref = db.doc("quotations/VMENF-Q-2022-001");
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Doc not found");

  const data = snap.data();
  const services = (data.services || []).map((s) => {
    const key = Object.keys(FIX).find((k) => (s.name || "").includes(k));
    return key ? { ...s, ...FIX[key] } : s;
  });

  const subtotal = services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 0), 0);
  const discount = Math.round(subtotal * 0.12 * 100) / 100;
  const grandTotal = Math.round((subtotal - discount) * 100) / 100;

  await ref.update({
    services,
    subtotal: Math.round(subtotal * 100) / 100,     // 4490
    discount,                                       // 538.8
    grandTotal,                                     // 3951.2
  });

  console.log({ subtotal, discount, grandTotal });
})();
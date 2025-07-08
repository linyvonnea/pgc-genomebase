import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const serviceAccount = require("./serviceAccountKey.json");
const projects = JSON.parse(readFileSync("./src/mock/projects.json", "utf-8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

function fixTimestamps(obj: any) {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (
        obj[key] &&
        typeof obj[key] === "object" &&
        obj[key].__datatype__ === "timestamp"
      ) {
        obj[key] = Timestamp.fromDate(new Date(obj[key].value));
      } else if (typeof obj[key] === "object") {
        fixTimestamps(obj[key]);
      }
    }
  }
  return obj;
}

async function importProjects() {
  for (const project of projects) {
    const fixed = fixTimestamps({ ...project });
    // Use project.id as the Firestore document ID
    await db.collection("projects").doc(project.pid).set(fixed);
    console.log("Imported project:", project.pid);
  }
  console.log("All projects imported!");
}

importProjects().catch(console.error);
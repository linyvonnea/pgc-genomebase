import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function calculateTotalIncome(slips: any[]) {
  return slips.reduce((sum, slip) => {
    if (slip.status === "paid") {
      return sum + (parseFloat(slip.total) || 0);
    }
    return sum;
  }, 0);
}

export async function fetchAllData(setters: {
  setFilteredProjects: (v: any[]) => void,
  setFilteredClients: (v: any[]) => void,
  setFilteredChargeSlips: (v: any[]) => void,
  setFilteredTrainings: (v: any[]) => void,
  setTotalIncome: (v: number) => void,
}) {
  const [pr, cl, cs, tr] = await Promise.all([
    getDocs(collection(db, "projects")),
    getDocs(collection(db, "clients")),
    getDocs(collection(db, "chargeSlips")),
    getDocs(collection(db, "trainings"))
  ]);
  const mapDocs = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  setters.setFilteredProjects(mapDocs(pr));
  setters.setFilteredClients(mapDocs(cl));
  setters.setFilteredChargeSlips(mapDocs(cs));
  setters.setFilteredTrainings(mapDocs(tr));
  setters.setTotalIncome(calculateTotalIncome(mapDocs(cs)));
}

export async function fetchFilteredData(
  startTS: Timestamp,
  endTS: Timestamp,
  setters: {
    setFilteredProjects: (v: any[]) => void,
    setFilteredClients: (v: any[]) => void,
    setFilteredChargeSlips: (v: any[]) => void,
    setFilteredTrainings: (v: any[]) => void,
    setTotalIncome: (v: number) => void,
  }
) {
  const [pr, cl, cs, tr] = await Promise.all([
    getDocs(query(collection(db, "projects"), where("startDate", ">=", startTS), where("startDate", "<=", endTS))),
    getDocs(query(collection(db, "clients"), where("createdAt", ">=", startTS), where("createdAt", "<=", endTS))),
    getDocs(query(
      collection(db, "chargeSlips"),
      where("dateIssued", ">=", startTS),
      where("dateIssued", "<=", endTS),
      where("status", "==", "paid")
    )),
    getDocs(query(collection(db, "trainings"), where("dateConducted", ">=", startTS), where("dateConducted", "<=", endTS)))
  ]);
  const mapDocs = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  setters.setFilteredProjects(mapDocs(pr));
  setters.setFilteredClients(mapDocs(cl));
  setters.setFilteredChargeSlips(mapDocs(cs));
  setters.setFilteredTrainings(mapDocs(tr));
  setters.setTotalIncome(calculateTotalIncome(mapDocs(cs)));
}
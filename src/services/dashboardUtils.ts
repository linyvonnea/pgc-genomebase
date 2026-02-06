import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function calculateTotalIncome(slips: any[]) {
  return slips.reduce((sum, slip) => {
    const status = slip.status ? slip.status.toString().toLowerCase().trim() : '';
    if (status === "paid") {
      const total = parseFloat(slip.total) || 0;
      return sum + total;
    }
    return sum;
  }, 0);
}

function filterProjectsByStatus(projects: any[]) {
  return projects.filter((project: any) => {
    const status = project.status ? project.status.toString().trim() : '';
    return status === "Completed" || status === "Ongoing";
  });
}

export async function fetchAllData(setters: {
  setTotalProjects: (v: number) => void,
  setFilteredProjects: (v: any[]) => void,
  setFilteredClients: (v: any[]) => void,
  setFilteredChargeSlips: (v: any[]) => void,
  setTotalIncome: (v: number) => void,
}) {
  const [activePr, pr, cl, cs] = await Promise.all([
    getDocs(query(collection(db, "projects"), where("status", "in", ["Ongoing", "Completed"]))),
    getDocs(collection(db, "projects")),
    getDocs(collection(db, "clients")),
    getDocs(collection(db, "chargeSlips"))
  ]);
  const mapDocs = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  
  const activeProjects = mapDocs(activePr);
  const projects = mapDocs(pr);
  const chargeSlips = mapDocs(cs);
  const totalIncome = calculateTotalIncome(chargeSlips);
  
  setters.setTotalProjects(activeProjects.length);
  setters.setFilteredProjects(projects);
  setters.setFilteredClients(mapDocs(cl));
  setters.setFilteredChargeSlips(chargeSlips);
  setters.setTotalIncome(totalIncome);
}

export async function fetchFilteredData(
  startTS: Timestamp,
  endTS: Timestamp,
  setters: {
    setTotalProjects: (v: number) => void,
    setFilteredProjects: (v: any[]) => void,
    setFilteredClients: (v: any[]) => void,
    setFilteredChargeSlips: (v: any[]) => void,
    setTotalIncome: (v: number) => void,
  }
) {
  const [pr, filteredPr, cl, cs] = await Promise.all([
    getDocs(collection(db, "projects")),
    getDocs(query(collection(db, "projects"), where("startDate", ">=", startTS), where("startDate", "<=", endTS))),
    getDocs(query(collection(db, "clients"), where("createdAt", ">=", startTS), where("createdAt", "<=", endTS))),
    getDocs(collection(db, "chargeSlips"))
  ]);
  const mapDocs = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  
  const allProjects = mapDocs(pr);
  const activeProjects = filterProjectsByStatus(allProjects);
  const filteredProjects = mapDocs(filteredPr);
  const allChargeSlips = mapDocs(cs);
  
  const chargeSlips = allChargeSlips.filter((slip: any) => {
    const status = slip.status ? slip.status.toString().toLowerCase().trim() : '';
    const isPaid = status === "paid";
    
    if (!isPaid) return false;
    
    if (slip.datePaid) {
      const datePaid = slip.datePaid.toDate ? slip.datePaid.toDate() : new Date(slip.datePaid);
      const startDate = startTS.toDate();
      const endDate = endTS.toDate();
      return datePaid >= startDate && datePaid <= endDate;
    }
    
    return false;
  });
  
  const totalIncome = calculateTotalIncome(chargeSlips);
  
  setters.setTotalProjects(activeProjects.length);
  setters.setFilteredProjects(filteredProjects);
  setters.setFilteredClients(mapDocs(cl));
  setters.setFilteredChargeSlips(chargeSlips); 
  setters.setTotalIncome(totalIncome);
}
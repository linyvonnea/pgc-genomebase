"use client";

import * as React from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatBarChart } from "@/components/dashboard/StatBarChart";
import { ServiceRequestedChart } from "@/components/dashboard/ServiceRequestedChart";
import { SendingInstitutionChart } from "@/components/dashboard/SendingInstitutionChart";
import { FundingCategoryChart } from "@/components/dashboard/FundingCategoryChart";
import { Timestamp } from "firebase/firestore";

export default function Dashboard() {
  const [filteredProjects, setFilteredProjects] = React.useState<any[]>([]);
  const [filteredClients, setFilteredClients] = React.useState<any[]>([]);
  const [filteredQuotations, setFilteredQuotations] = React.useState<any[]>([]);
  const [totalIncome, setTotalIncome] = React.useState<number>(0)
  const [timeRange, setTimeRange] = React.useState("all");
  const [customRange, setCustomRange] = React.useState<{
    year: number;
    startMonth: number;
    endMonth: number;
  }>();
  const [loading, setLoading] = React.useState(true);

  const calculateTotalIncome = (quotations: any[]) => {
    return quotations.reduce((sum, quotation) => {
      const total = parseFloat(quotation.total) || 0;
      return sum + total;
    }, 0);
  };

  const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch (error) {
      console.error("Error parsing date string:", error);
      return null;
    }
  };

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [projectsSnapshot, clientsSnapshot, quotationsSnapshot] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "quotations")) 
        ]);

        const projectsData = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const quotationsData = quotationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setFilteredProjects(projectsData);
        setFilteredClients(clientsData);
        setFilteredQuotations(quotationsData);
        setTotalIncome(calculateTotalIncome(quotationsData));
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleTimeFilterChange = async (
    range: string | { year: number; startMonth: number; endMonth: number }
  ) => {
    try {
      setLoading(true);
      let projectsQuery = query(collection(db, "projects"));
      let clientsQuery = query(collection(db, "clients"));
      let quotationsQuery = query(collection(db, "quotations"));

      if (typeof range === "string") {
        setTimeRange(range);
        setCustomRange(undefined);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        switch(range) {
          case "today":
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", todayTimestamp)
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", todayTimestamp)
            );
            quotationsQuery = query(
              collection(db, "quotations"),
              where("dateIssued", ">=", today.toISOString())
            );
            break;
          case "weekly":
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", Timestamp.fromDate(weekAgo))
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", Timestamp.fromDate(weekAgo))
            );
            quotationsQuery = query(
              collection(db, "quotations"),
              where("dateIssued", ">=", weekAgo.toISOString())
            );
            break;
          case "monthly":
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", Timestamp.fromDate(monthAgo))
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", Timestamp.fromDate(monthAgo))
            );
            quotationsQuery = query(
              collection(db, "quotations"),
              where("dateIssued", ">=", monthAgo.toISOString())
            );
            break;
          case "yearly":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", Timestamp.fromDate(yearAgo))
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", Timestamp.fromDate(yearAgo))
            );
            quotationsQuery = query(
              collection(db, "quotations"),
              where("dateIssued", ">=", yearAgo.toISOString())
            );
            break;
          default: 
            break;
        }
      } else {
        setTimeRange("custom");
        setCustomRange(range);
        const { year, startMonth, endMonth } = range;
        
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, endMonth + 1, 0);
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        projectsQuery = query(
          collection(db, "projects"),
          where("startDate", ">=", startTimestamp),
          where("startDate", "<=", endTimestamp)
        );
        clientsQuery = query(
          collection(db, "clients"),
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp)
        );
        quotationsQuery = query(
          collection(db, "quotations"),
          where("dateIssued", ">=", startDate.toISOString()),
          where("dateIssued", "<=", endDate.toISOString())
        );
      }

      const [projectsSnapshot, clientsSnapshot, quotationsSnapshot] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(clientsQuery),
        getDocs(quotationsQuery)
      ]);

      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const quotationsData = quotationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setFilteredProjects(projectsData);
      setFilteredClients(clientsData);
      setFilteredQuotations(quotationsData);
      setTotalIncome(calculateTotalIncome(quotationsData));
    } catch (error) {
      console.error("Error filtering data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex-grow min-w-0">
          Welcome, Admin!
        </h1>
        <div>
          <TimeFilter onFilterChange={handleTimeFilterChange} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="w-full flex flex-col gap-4 mb-4">
            <StatCard title="Total Income" value={totalIncome.toLocaleString()} />
          </div>
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="w-full lg:w-1/4 flex flex-col gap-4">
              <StatCard title="Total Clients" value={filteredClients.length} />
              <StatCard title="Total Projects" value={filteredProjects.length} />
              <StatCard title="Total Quotations" value={filteredQuotations.length} />
            </div>
            
            <div className="flex-1 min-w-0 h-[350px] min-h-[350px]">
              <StatBarChart 
                projectsData={filteredProjects}
                clientsData={filteredClients}
                timeRange={timeRange}
                customRange={customRange}
              />
            </div>
          </div>

          {/* Pie Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ServiceRequestedChart projects={filteredProjects} />
            <SendingInstitutionChart projects={filteredProjects} />
            <FundingCategoryChart projects={filteredProjects} />
          </div>
        </>
      )}
    </div>
  );
}
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

export default function Dashboard() {
  const [filteredProjects, setFilteredProjects] = React.useState<any[]>([]);
  const [filteredClients, setFilteredClients] = React.useState<any[]>([]);
  const [timeRange, setTimeRange] = React.useState("all");
  const [customRange, setCustomRange] = React.useState<{
    year: number;
    startMonth: number;
    endMonth: number;
  }>();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch all projects and clients initially
        const [projectsSnapshot, clientsSnapshot] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "clients"))
        ]);

        setFilteredProjects(projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        setFilteredClients(clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
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

      if (typeof range === "string") {
        setTimeRange(range);
        setCustomRange(undefined);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch(range) {
          case "today":
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", today)
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", today)
            );
            break;
          case "weekly":
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", weekAgo)
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", weekAgo)
            );
            break;
          case "monthly":
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", monthAgo)
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", monthAgo)
            );
            break;
          case "yearly":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            projectsQuery = query(
              collection(db, "projects"),
              where("startDate", ">=", yearAgo)
            );
            clientsQuery = query(
              collection(db, "clients"),
              where("createdAt", ">=", yearAgo)
            );
            break;
          default: // "all"
            // No filters needed
            break;
        }
      } else {
        // Handle custom range
        setTimeRange("custom");
        setCustomRange(range);
        const { year, startMonth, endMonth } = range;
        
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, endMonth + 1, 0); // Last day of end month

        projectsQuery = query(
          collection(db, "projects"),
          where("startDate", ">=", startDate),
          where("startDate", "<=", endDate)
        );
        clientsQuery = query(
          collection(db, "clients"),
          where("createdAt", ">=", startDate),
          where("createdAt", "<=", endDate)
        );
      }

      const [projectsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(clientsQuery)
      ]);

      setFilteredProjects(projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
      setFilteredClients(clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error("Error filtering data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 rounded-lg">
      {/* Header Section */}
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
          {/* Stats + Bar Chart */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="w-full lg:w-1/4 flex flex-col gap-4">
              <StatCard title="Total Clients" value={filteredClients.length} />
              <StatCard title="Total Projects" value={filteredProjects.length} />
              <StatCard title="Total Trainings" value={8} />
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
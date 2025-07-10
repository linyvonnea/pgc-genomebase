// src/app/dashboard/page.tsx
"use client";

import * as React from "react";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatBarChart } from "@/components/dashboard/StatBarChart";
import { ServiceRequestedChart } from "@/components/dashboard/ServiceRequestedChart";
import { SendingInstitutionChart } from "@/components/dashboard/SendingInstitutionChart";
import { FundingCategoryChart } from "@/components/dashboard/FundingCategoryChart";
import clients from "@/mock/clients.json";
import projects from "@/mock/projects.json";

export default function Dashboard() {
  const [filteredProjects, setFilteredProjects] = React.useState(projects);
  const [filteredClients, setFilteredClients] = React.useState(clients);
  const [timeRange, setTimeRange] = React.useState("all");
  const [customRange, setCustomRange] = React.useState<{
    year: number;
    startMonth: number;
    endMonth: number;
  }>();

  const handleTimeFilterChange = (
    range: string | { year: number; startMonth: number; endMonth: number }
  ) => {
    if (typeof range === "string") {
      setTimeRange(range);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filterByDate = (dateString: string) => {
        const itemDate = new Date(dateString);
        
        switch(range) {
          case "today":
            return itemDate >= today;
          case "weekly":
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return itemDate >= weekAgo;
          case "monthly":
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return itemDate >= monthAgo;
          case "yearly":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return itemDate >= yearAgo;
          default:
            return true;
        }
      };

      setFilteredProjects(projects.filter(p => filterByDate(p.startDate.value)));
      setFilteredClients(clients.filter(c => filterByDate(c.dateReceived.value)));
    } else {
      setTimeRange("custom");
      setCustomRange(range);
      const { year, startMonth, endMonth } = range;
      
      const filterByYearMonth = (dateString: string) => {
        const date = new Date(dateString);
        return (
          date.getFullYear() === year &&
          date.getMonth() >= startMonth &&
          date.getMonth() <= endMonth
        );
      };

      setFilteredProjects(projects.filter(p => filterByYearMonth(p.startDate.value)));
      setFilteredClients(clients.filter(c => filterByYearMonth(c.dateReceived.value)));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 rounded-lg">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex-grow min-w-0">Welcome, Admin!</h1>
        <div>
          <TimeFilter onFilterChange={handleTimeFilterChange} />
        </div>
      </div>

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
    </div>
  );
}
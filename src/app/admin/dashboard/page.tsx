"use client";

import * as React from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatBarChart } from "@/components/dashboard/StatBarChart";
import { ServiceRequestedChart } from "@/components/dashboard/ServiceRequestedChart";
import { SendingInstitutionChart } from "@/components/dashboard/SendingInstitutionChart";
import { FundingCategoryChart } from "@/components/dashboard/FundingCategoryChart";
import { Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Dashboard() {
  const [userName, setUserName] = React.useState("User");
  const [filteredProjects, setFilteredProjects] = React.useState<any[]>([]);
  const [filteredClients, setFilteredClients] = React.useState<any[]>([]);
  const [filteredQuotations, setFilteredQuotations] = React.useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = React.useState<any[]>([]);
  const [totalIncome, setTotalIncome] = React.useState<number>(0);
  const [timeRange, setTimeRange] = React.useState("all");
  const [customRange, setCustomRange] = React.useState<{
    year: number;
    startMonth: number;
    endMonth: number;
  }>();
  const [loading, setLoading] = React.useState(true);

  const exportToPDF = async () => {
    const dashboardElement = document.getElementById("dashboard-content");
    if (!dashboardElement) {
      console.error("Dashboard content element not found");
      return;
    }

    try {
      setLoading(true);
      
      const exportButton = document.querySelector('[onClick*="exportToPDF"], button[onclick*="exportToPDF"]') as HTMLElement | null;
      let originalButtonDisplay = "";
      
      if (exportButton) {
        originalButtonDisplay = exportButton.style.display;
        exportButton.style.display = 'none'; 
      }

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      if (exportButton) {
        exportButton.style.display = originalButtonDisplay;
      }

      const pdf = new jsPDF('landscape');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margins = {
        left: 10,
        right: 10,
        top: 15,
        bottom: 15
      };

      // Calculate available space
      const contentWidth = pageWidth - margins.left - margins.right;
      const contentHeight = pageHeight - margins.top - margins.bottom;

      // Calculate image dimensions to fit while maintaining aspect ratio
      const imgRatio = canvas.width / canvas.height;
      let imgWidth = contentWidth;
      let imgHeight = imgWidth / imgRatio;

      // Adjust if too tall
      if (imgHeight > contentHeight) {
        imgHeight = contentHeight;
        imgWidth = imgHeight * imgRatio;
      }

      // Center the content
      const x = margins.left + (contentWidth - imgWidth) / 2;
      const y = margins.top + (contentHeight - imgHeight) / 2;

      // Add to PDF
      pdf.addImage(canvas, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save('dashboard-report.pdf');

    } catch (error) {
      console.error('Error during PDF export:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.displayName) {
        setUserName(user.displayName);
      }
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [projectsSnapshot, clientsSnapshot, quotationsSnapshot, trainingsSnapshot] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "quotations")), 
          getDocs(collection(db, "trainings")), 
          getDocs(collection(db, "users"))
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
        const trainingsData = trainingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setFilteredProjects(projectsData);
        setFilteredClients(clientsData);
        setFilteredQuotations(quotationsData);
        setFilteredTrainings(trainingsData);
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
      let trainingsQuery = query(collection(db, "trainings")); 
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
            trainingsQuery = query(
              collection(db, "trainings"),
              where("dateConducted", ">=", todayTimestamp)
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
            trainingsQuery = query(
              collection(db, "trainings"),
              where("dateConducted", ">=", Timestamp.fromDate(weekAgo))
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
            trainingsQuery = query(
              collection(db, "trainings"),
              where("dateConducted", ">=", Timestamp.fromDate(monthAgo))
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
            trainingsQuery = query(
              collection(db, "trainings"),
              where("dateConducted", ">=", Timestamp.fromDate(yearAgo))
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
        trainingsQuery = query(
          collection(db, "trainings"),
          where("date", ">=", startTimestamp),
          where("date", "<=", endTimestamp)
        );
      }

      const [projectsSnapshot, clientsSnapshot, quotationsSnapshot, trainingsSnapshot] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(clientsQuery),
        getDocs(quotationsQuery),
        getDocs(trainingsQuery)
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
      const trainingsData = trainingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setFilteredProjects(projectsData);
      setFilteredClients(clientsData);
      setFilteredQuotations(quotationsData);
      setFilteredTrainings(trainingsData);
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
          Welcome, {userName}!
        </h1>
        <div className="flex gap-2">
          <TimeFilter onFilterChange={handleTimeFilterChange} />
        </div>
      </div>

      <div id="dashboard-content">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="gap-4 mb-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                  <StatCard 
                    title="Total Clients" 
                    value={filteredClients.length}
                    colorIndex={0} 
                  />
                  <StatCard 
                    title="Total Projects" 
                    value={filteredProjects.length}
                    colorIndex={1} 
                  />
                  <StatCard 
                    title="Total Trainings" 
                    value={filteredTrainings.length}
                    colorIndex={2}
                  />
                  <StatCard 
                    title="Total Income" 
                    value={totalIncome.toLocaleString()}
                    colorIndex={3}
                  />
                </div>
              </div>
              <div className="h-[400px]"> 
                <StatBarChart
                  projectsData={filteredProjects}
                  clientsData={filteredClients}
                  trainingsData={filteredTrainings}
                  timeRange={timeRange}
                  customRange={customRange}
                />
              </div>
            </div>          
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ServiceRequestedChart projects={filteredProjects} />
              <SendingInstitutionChart projects={filteredProjects} />
              <FundingCategoryChart projects={filteredProjects} />
            </div>

          </>
        )}
      </div>
      <div className="flex justify-end mt-6">
              <Button 
                variant="outline" 
                onClick={exportToPDF}
                disabled={loading}
                className="w-[160px] text-left truncate"
              >
                {loading ? "Generating..." : "Export as PDF"}
              </Button>
      </div>
    </div>
  );
}
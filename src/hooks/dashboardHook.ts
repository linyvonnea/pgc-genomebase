// src/hooks/useDashboardData.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { calculateTotalIncome, fetchAllData, fetchFilteredData } from "../services/dashboardUtils";
import html2canvas from "html2canvas";

type TimeRange = "all" | "today" | "weekly" | "monthly" | "yearly" | "custom";
type CustomRange = { year: number; startMonth: number; endMonth: number };

export function useDashboardData() {
  const [userName, setUserName] = useState("User");
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<any[]>([]);
  const [filteredChargeSlips, setFilteredChargeSlips] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customRange, setCustomRange] = useState<CustomRange | undefined>();

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.displayName) setUserName(user.displayName);
    });
    return () => unsub();
  }, []);

  const fetchAllDataHandler = async () => {
    await fetchAllData({
      setFilteredProjects,
      setFilteredClients,
      setFilteredChargeSlips,
      setFilteredTrainings,
      setTotalIncome
    });
  };

  useEffect(() => {
    fetchAllDataHandler().then(() => setLoading(false));
  }, []);

  const handleTimeFilterChange = async (range: TimeRange | CustomRange) => {
    setLoading(true);

    // Handle string ranges
    if (typeof range === "string") {
      setTimeRange(range);
      setCustomRange(undefined);

      if (range === "all") {
        await fetchAllDataHandler();
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let start: Date;

      switch (range) {
        case "today":
          start = today;
          break;
        case "weekly":
          start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          start = new Date(today.setMonth(today.getMonth() - 1));
          break;
        case "yearly":
          start = new Date(today.setFullYear(today.getFullYear() - 1));
          break;
        default:
          start = today;
      }

      const startTS = Timestamp.fromDate(start);
      const endTS = Timestamp.fromDate(new Date());

      await fetchFilteredData(startTS, endTS, { setFilteredProjects, setFilteredClients, setFilteredChargeSlips, setFilteredTrainings, setTotalIncome });
      setLoading(false);
      return;
    }

    // Handle custom date ranges
    setTimeRange("custom");
    setCustomRange(range);

    const startDate = new Date(range.year, range.startMonth, 1);
    const endDate = new Date(range.year, range.endMonth + 1, 0);
    const startTS = Timestamp.fromDate(startDate);
    const endTS = Timestamp.fromDate(endDate);

    await fetchFilteredData(startTS, endTS, { setFilteredProjects, setFilteredClients, setFilteredChargeSlips, setFilteredTrainings, setTotalIncome });
    setLoading(false);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById("dashboard-content");
    if (!element) {
      console.error("Missing dashboard-content");
      setIsExporting(false);
      return;
    }

    try {
      const canvas = await html2canvas(element);
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [297, 240 + 20] 
      });
      const imgData = canvas.toDataURL("image/png");

      const margin = 5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(
        (pageWidth - margin * 2) / imgWidth,
        (pageHeight - margin * 2) / imgHeight
      );
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      const dateStr = new Date().toLocaleString();
      const filterStr = timeRange === "custom"
        ? `Custom: ${customRange?.year ?? ""} (${(customRange?.startMonth ?? 0) + 1}-${(customRange?.endMonth ?? 0) + 1})`
        : `Filter: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`;
      pdf.setFontSize(10);
      // Draw date and filter at the top, inside the margin
      const textY = margin + 10;
      pdf.text(`Date Generated: ${dateStr}`, margin, textY);
      pdf.text(
        filterStr,
        pageWidth - margin - pdf.getTextWidth(filterStr),
        textY
      );

      // Draw the image starting just below the header text
      pdf.addImage(imgData, "PNG", x, textY + 6, finalWidth, finalHeight);
      pdf.save("dashboard-report.pdf");
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    userName,
    loading,
    isExporting,
    filteredProjects,
    filteredClients,
    filteredTrainings,
    timeRange,
    customRange,
    totalIncome,
    handleTimeFilterChange,
    exportToPDF
  };
}

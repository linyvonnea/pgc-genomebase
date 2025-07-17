import html2canvas from "html2canvas";

export async function exportDashboardPDF({
  elementId,
  timeRange,
  customRange,
  monthNames
}: {
  elementId: string;
  timeRange: string;
  customRange?: { startMonth?: number; endMonth?: number; year?: number };
  monthNames: string[];
}) {
  const element = document.getElementById("dashboard-content");
  if (!element) {
    throw new Error("Missing dashboard-content");
  }

  // Save original style
  const originalWidth = element.style.width;

  // Force fixed width for export (e.g., 1200px)
  element.style.width = "1200px";

  // Wait for browser to reflow
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Get dashboard size in pixels
  const rect = element.getBoundingClientRect();
  const dashboardWidthPx = rect.width;
  const dashboardHeightPx = rect.height;

  // Convert pixels to mm (1px ≈ 0.264583 mm)
  const pxToMm = (px: number) => px * 0.264583;
  const pdfWidth = pxToMm(dashboardWidthPx);
  const pdfHeight = pxToMm(dashboardHeightPx);

  // Render dashboard to canvas
  const canvas = await html2canvas(element, { scale: 2 });
  const jsPDF = (await import("jspdf")).default;

  // Restore original style
  element.style.width = originalWidth;

  // Create PDF with dashboard size
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
    unit: "mm",
    format: [pdfWidth, pdfHeight]
  });

  const imgData = canvas.toDataURL("image/png");

  // Set margin in mm
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  // Fill the page with the image, leaving margin
  pdf.addImage(
    imgData,
    "PNG",
    margin,
    margin,
    contentWidth,
    contentHeight
  );

  const dateStr = new Date().toLocaleString();
  const filterStr = timeRange === "custom"
    ? `${monthNames[customRange?.startMonth ?? 0]}-${monthNames[customRange?.endMonth ?? 0]} ${customRange?.year ?? ""}`
    : `Filter: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`;
  pdf.setFontSize(10);
  pdf.text(`Date Generated: ${dateStr}`, margin, margin - 2);
  pdf.text(
    filterStr,
    pdfWidth - margin - pdf.getTextWidth(filterStr),
    margin - 2
  );

  pdf.save("dashboard-report.pdf");
}
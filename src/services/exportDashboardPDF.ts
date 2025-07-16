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
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Missing dashboard-content");
  }

  const canvas = await html2canvas(element);
  const jsPDF = (await import("jspdf")).default;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [300, 350]
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

  const dateStr = new Date().toLocaleString();
  const filterStr = timeRange === "custom"
    ? `${monthNames[customRange?.startMonth ?? 0]}-${monthNames[customRange?.endMonth ?? 0]} ${customRange?.year ?? ""}`
    : `Filter: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`;
  pdf.setFontSize(10);
  const textY = margin + 10;
  pdf.text(`Date Generated: ${dateStr}`, margin, textY);
  pdf.text(
    filterStr,
    pageWidth - margin - pdf.getTextWidth(filterStr),
    textY
  );

  pdf.addImage(imgData, "PNG", x, textY + 6, finalWidth, finalHeight);
  pdf.save("dashboard-report.pdf");
}
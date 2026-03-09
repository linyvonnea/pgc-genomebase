"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientConforme } from "@/types/ClientConforme";
import { toast } from "sonner";

interface DownloadConformeButtonProps {
  conforme: ClientConforme;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  showText?: boolean;
}

export default function DownloadConformeButton({ 
  conforme, 
  variant = "outline", 
  size = "sm",
  showText = true
}: DownloadConformeButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!conforme.id) {
      toast.error("No document ID available");
      return;
    }

    try {
      setIsDownloading(true);
      
      // Call the server-side PDF generation API
      const response = await fetch(`/api/generate-conforme-pdf?id=${conforme.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the PDF blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const fileName = `Client_Conforme_${conforme.data.clientName.replace(/\s+/g, '_')}_${conforme.data.inquiryId}.pdf`;
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      disabled={isDownloading}
      onClick={handleDownload}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {showText && "Generating..."}
        </>
      ) : (
        <>
          <Download className="w-3 h-3 mr-1" />
          {showText && "Export PDF"}
        </>
      )}
    </Button>
  );
}

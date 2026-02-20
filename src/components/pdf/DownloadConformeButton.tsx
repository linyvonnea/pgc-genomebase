"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientConforme } from "@/types/ClientConforme";

// Dynamically import PDF components to avoid SSR issues
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const ClientConformePDF = dynamic(
  () => import("@/components/pdf/ClientConformePDF").then((mod) => mod.ClientConformePDF),
  { ssr: false }
);

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        {showText && "Loading..."}
      </Button>
    );
  }

  const fileName = `Client_Conforme_${conforme.data.clientName.replace(/\s+/g, '_')}_${conforme.data.inquiryId}.pdf`;

  return (
    <PDFDownloadLink
      document={<ClientConformePDF conforme={conforme} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant={variant} size={size} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {showText && "Preparing..."}
            </>
          ) : (
            <>
              <Download className="w-3 h-3 mr-1" />
              {showText && "Export PDF"}
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

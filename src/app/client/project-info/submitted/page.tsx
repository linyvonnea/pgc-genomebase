"use client";
import { useEffect, useState } from "react";
import ConfirmationPage from "@/components/ConfirmationPage";

//Thank you page for project info submission

export default function ProjectInfoSubmittedPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-lg text-blue-700 font-semibold">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ConfirmationPage
      title="Thank You!"
      message="Your project details have been successfully submitted. PGC Visayas will review your project and reach out to you if needed."
      emailInfo="Your project information has been saved."
      showEmail={true}
      showLogout={false}
    />
  );
}

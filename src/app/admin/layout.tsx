// src/app/admin/layout.tsx
"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { TabBar } from "@/components/layout/TabBar";
import { TabContent } from "@/components/layout/TabContent";
import { TabProvider } from "@/contexts/TabContext";
import { Toaster } from "@/components/ui/sonner";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user && !isAdmin) {
      router.replace("/client/inquiry-request");
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#F69122]/10 to-[#912ABD]/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#166FB5]/10 to-[#4038AF]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] rounded-full flex items-center justify-center mx-auto animate-spin">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">Checking access...</p>
            <p className="text-sm text-muted-foreground">Please wait while we verify your permissions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TabProvider>
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <TabBar />
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50/30 via-blue-50/20 to-indigo-50/30">
            <TabContent>{children}</TabContent>
          </main>
        </div>
        <Toaster />
      </div>
    </TabProvider>
  );
}
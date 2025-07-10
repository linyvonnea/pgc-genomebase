// src/app/admin/layout.tsx
"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
        <main className="p-6">{children}</main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
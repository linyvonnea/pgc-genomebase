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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.push("/"); // redirect non-admins
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>;
  }

  if (!isAdmin) return null;

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
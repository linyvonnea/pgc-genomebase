//src/app/client/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/ui/header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signIn, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // If not logged in, but on /client/client-info, redirect to /verify instead of /login
      if (typeof window !== 'undefined' && window.location.pathname === '/client/client-info') {
        router.replace('/verify');
      } else {
        router.replace('/login');
      }
    } else if (!loading && user && isAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={signOut} />
      <main className="p-6 flex-1">{children}</main>
    </div>
  );
}

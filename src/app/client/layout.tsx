"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import Header from "@/components/ui/header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      signIn(); // trigger login
    }
  }, [user, signIn]);

  if (!user) return <div className="p-6">Signing in...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r">
        <ClientSidebar />
      </aside>

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
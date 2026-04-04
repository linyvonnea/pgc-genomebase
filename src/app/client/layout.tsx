//src/app/client/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/ui/header";
import {
  DEFAULT_PORTAL_FEATURES,
  getConfigurationSettings,
} from "@/services/configurationSettingsService";
import { ConfigurationSettings } from "@/types/ConfigurationSettings";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signIn, signOut, loading } = useAuth();
  const router = useRouter();
  const [configSettings, setConfigSettings] = useState<ConfigurationSettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const data = await getConfigurationSettings();
        if (isMounted) setConfigSettings(data);
      } catch (error) {
        console.error("Failed to load configuration settings:", error);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // If not logged in, but on /client/client-info, redirect to /portal instead of /login
      if (typeof window !== 'undefined' && window.location.pathname === '/client/client-info') {
        router.replace('/portal');
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header
        user={user}
        onLogout={signOut}
        menuVisibility={configSettings?.portalFeatures ?? DEFAULT_PORTAL_FEATURES}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

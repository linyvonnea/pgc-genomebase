"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Header from "@/components/ui/header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <h1 className="text-xl mb-4 font-semibold">Welcome to PGC GenomeBase</h1>
        <button
          onClick={async () => {
            if (isSigningIn) return;
            setIsSigningIn(true);
            try {
              await signIn();
            } catch (e) {
              console.error("Login failed:", e);
            } finally {
              setIsSigningIn(false);
            }
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
        >
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </button>
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
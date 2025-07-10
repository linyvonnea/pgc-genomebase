// src/app/login/page.tsx
"use client";

import { useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/services/userService";

export default function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user) {
        const role = await getUserRole(user.email!);
        if (role === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/client/inquiry-request");
        }
      }
    };
    checkAndRedirect();
  }, [user, router]);

  if (loading) {
    return <div className="p-6">Checking authentication...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded shadow-md text-center space-y-6">
        <h1 className="text-xl font-bold">Welcome to GenomeBase</h1>
        <button
          onClick={signIn}
          className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, isAdmin, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/client");
      }
    }
  }, [user, isAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Sign in to PGC GenomeBase</h1>
        <p className="text-muted-foreground text-sm">
          Use your Google account to continue.
        </p>
        <Button onClick={signIn} className="w-full">
          Sign in with Google
        </Button>
        <p className="text-xs text-muted-foreground">
          Admins must use their @up.edu.ph email.
        </p>
      </div>
    </div>
  );
}
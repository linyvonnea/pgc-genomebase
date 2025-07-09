// src/components/UserAuthMenu.tsx
"use client";

import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function UserAuthMenu() {
  const { user, signIn, signOut, isAdmin } = useAuth();

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <>
          <span className="text-sm">
            {user.displayName} ({isAdmin ? "Admin" : "Client"})
          </span>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </>
      ) : (
        <Button onClick={signIn}>Sign in with Google</Button>
      )}
    </div>
  );
}
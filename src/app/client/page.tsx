"use client";

import useAuth from "@/hooks/useAuth";

export default function ClientLandingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Welcome to the Client Portal</h1>
      <p className="text-muted-foreground">
        Hello {user?.displayName || user?.email}! You're signed in and ready to get started.
      </p>

      <ul className="list-disc list-inside space-y-1">
        <li>Submit your inquiry request</li>
        <li>Fill out your Client Information Sheet</li>
        <li>Complete your Project Information Sheet</li>
      </ul>
    </div>
  );
}
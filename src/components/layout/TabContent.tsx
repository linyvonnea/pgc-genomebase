"use client";

import React from "react";
import { useTabContext } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * TabContent Component
 * 
 * Simply renders children - the actual page content comes from Next.js routing.
 * This component exists to provide a consistent container with styling.
 */
export function TabContent({ children, className }: TabContentProps) {
  const { tabs } = useTabContext();

  return (
    <div className={cn("h-full overflow-auto p-6 lg:p-8", className)}>
      {children}
    </div>
  );
}

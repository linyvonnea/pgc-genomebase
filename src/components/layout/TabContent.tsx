"use client";

import React, { Suspense, lazy, ComponentType } from "react";
import { useTabContext } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";

// Loading fallback component
function ModuleLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-[#166FB5] rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading module...</p>
      </div>
    </div>
  );
}

// Module component cache - keeps components mounted
const moduleCache = new Map<string, React.ReactNode>();

interface TabContentProps {
  moduleComponents: Record<string, ComponentType>;
  className?: string;
}

export function TabContent({ moduleComponents, className }: TabContentProps) {
  const { tabs, activeTab } = useTabContext();

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <p className="text-lg font-medium">No modules open</p>
          <p className="text-sm">Select a module from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full", className)}>
      {tabs.map((tab) => {
        const Component = moduleComponents[tab.id];
        if (!Component) return null;

        return (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0 overflow-auto",
              activeTab === tab.id ? "visible z-10" : "invisible z-0"
            )}
          >
            <Suspense fallback={<ModuleLoading />}>
              <Component />
            </Suspense>
          </div>
        );
      })}
    </div>
  );
}

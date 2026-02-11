"use client";

import React, { ComponentType } from "react";
import { useTabContext } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";

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

        const isActive = activeTab === tab.id;

        return (
          <div
            key={tab.id}
            className={cn(
              "h-full overflow-auto",
              isActive ? "block" : "hidden"
            )}
          >
            <Component />
          </div>
        );
      })}
    </div>
  );
}

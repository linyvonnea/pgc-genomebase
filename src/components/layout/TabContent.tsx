"use client";

import React, { Suspense, ComponentType, useMemo } from "react";
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

// Create a wrapper component that preserves state
function PreservedComponent({ Component, isVisible }: { Component: ComponentType; isVisible: boolean }) {
  return (
    <div className={cn(
      "absolute inset-0 overflow-auto",
      isVisible ? "visible z-10" : "invisible z-0 pointer-events-none"
    )}>
      <Suspense fallback={<ModuleLoading />}>
        <Component />
      </Suspense>
    </div>
  );
}

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

  // Memoize components to preserve their state
  const preservedComponents = useMemo(() => {
    return tabs.map((tab) => {
      const Component = moduleComponents[tab.id];
      if (!Component) return null;
      
      return (
        <PreservedComponent
          key={tab.id}
          Component={Component}
          isVisible={activeTab === tab.id}
        />
      );
    });
  }, [tabs.map(t => t.id).join(','), moduleComponents, activeTab]);

  return (
    <div className={cn("relative h-full", className)}>
      {preservedComponents}
    </div>
  );
}

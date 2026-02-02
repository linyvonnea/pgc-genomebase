"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabContext, Tab } from "@/contexts/TabContext";

interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabContext();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-white border-b border-slate-200", className)}>
      <div className="flex items-center gap-0.5 px-2 pt-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onActivate={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onActivate, onClose }: TabItemProps) {
  const Icon = tab.icon;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={onActivate}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer transition-all duration-150 min-w-[120px] max-w-[200px] select-none",
        isActive
          ? "bg-slate-50 border border-b-0 border-slate-200 text-slate-900 shadow-sm -mb-px z-10"
          : "bg-slate-100/50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-transparent"
      )}
    >
      {Icon && (
        <Icon className={cn(
          "w-4 h-4 flex-shrink-0",
          isActive ? "text-[#166FB5]" : "text-slate-500"
        )} />
      )}
      <span className="text-sm font-medium truncate flex-1">{tab.label}</span>
      {tab.closable !== false && (
        <button
          onClick={handleClose}
          className={cn(
            "p-0.5 rounded hover:bg-slate-200 transition-colors flex-shrink-0",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      )}
    </div>
  );
}

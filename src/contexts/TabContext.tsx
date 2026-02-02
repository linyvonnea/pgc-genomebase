"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  path: string;
  icon?: React.ElementType;
  closable?: boolean;
}

interface TabContextType {
  tabs: Tab[];
  activeTab: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  isTabOpen: (tabId: string) => boolean;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTabState] = useState<string | null>(null);

  const openTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.id === tab.id);
      if (existingTab) {
        return prevTabs;
      }
      return [...prevTabs, { ...tab, closable: tab.closable !== false }];
    });
    setActiveTabState(tab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
      const newTabs = prevTabs.filter((t) => t.id !== tabId);
      
      // If closing the active tab, switch to another tab
      if (activeTab === tabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabState(newTabs[newActiveIndex]?.id || null);
      } else if (newTabs.length === 0) {
        setActiveTabState(null);
      }
      
      return newTabs;
    });
  }, [activeTab]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId);
  }, []);

  const isTabOpen = useCallback((tabId: string) => {
    return tabs.some((t) => t.id === tabId);
  }, [tabs]);

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTab,
        openTab,
        closeTab,
        setActiveTab,
        isTabOpen,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
}

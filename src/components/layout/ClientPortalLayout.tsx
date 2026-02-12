"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  Users, 
  FileText, 
  CreditCard, 
  Menu, 
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SidebarSection {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "complete" | "incomplete" | "locked" | "active";
  badge?: string;
  locked?: boolean;
}

interface ClientPortalLayoutProps {
  children: ReactNode;
  activeSection: string;
  sections: SidebarSection[];
  onSectionChange: (sectionId: string) => void;
  projectTitle?: string;
  projectId?: string;
}

export default function ClientPortalLayout({
  children,
  activeSection,
  sections,
  onSectionChange,
  projectTitle = "Project Portal",
  projectId,
}: ClientPortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "incomplete":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "locked":
        return <Lock className="h-4 w-4 text-slate-400" />;
      default:
        return <ChevronRight className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "border-l-green-500 bg-green-50";
      case "incomplete":
        return "border-l-amber-500 bg-amber-50";
      case "locked":
        return "border-l-slate-300 bg-slate-50";
      case "active":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-transparent";
    }
  };

  const handleSectionClick = (section: SidebarSection) => {
    if (section.locked) return;
    onSectionChange(section.id);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-[#166FB5] to-[#4038AF]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold text-lg truncate">
            {projectTitle}
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/20 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {projectId && (
          <p className="text-xs text-white/80 font-mono">{projectId}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section)}
              disabled={section.locked}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border-l-4 transition-all duration-200",
                isActive
                  ? "border-l-[#166FB5] bg-blue-50 shadow-sm"
                  : section.locked
                  ? "border-l-slate-300 bg-slate-50 cursor-not-allowed opacity-60"
                  : "border-l-transparent hover:border-l-slate-300 hover:bg-slate-50",
                getStatusColor(section.status)
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  isActive ? "bg-white" : "bg-white/50"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive ? "text-[#166FB5]" : "text-slate-600"
                  )} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    isActive ? "text-[#166FB5]" : "text-slate-700"
                  )}>
                    {section.label}
                  </p>
                  {section.badge && (
                    <p className="text-xs text-slate-500 mt-0.5">{section.badge}</p>
                  )}
                </div>
              </div>
              {getStatusIcon(section.status)}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/verify")}
          className="w-full justify-start text-slate-600 hover:text-slate-800"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Exit Portal
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-slate-800 truncate">{projectTitle}</h1>
          {projectId && (
            <p className="text-xs text-slate-500 font-mono">{projectId}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex h-[calc(100vh-64px)] lg:h-screen">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-80 bg-white border-r border-slate-200 shadow-sm flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 lg:hidden shadow-xl">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

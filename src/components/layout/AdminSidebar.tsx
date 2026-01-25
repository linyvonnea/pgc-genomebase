// AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  LibraryBig,
  MessageSquare,
  FileText,
  Calculator,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { 
      href: "/admin/dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
    },
    { 
      href: "/admin/inquiry", 
      label: "Inquiries", 
      icon: MessageSquare,
    },
    { 
      href: "/admin/projects", 
      label: "Projects", 
      icon: LibraryBig,
    },
    { 
      href: "/admin/clients", 
      label: "Clients", 
      icon: Users,
    },
    { 
      href: "/admin/quotations", 
      label: "Quotations", 
      icon: FileText,
    },
    { 
      href: "/admin/charge-slips", 
      label: "Charge Slips", 
      icon: Receipt,
    },
    { 
      href: "/admin/manual-quotation", 
      label: "Manual Quotation", 
      icon: Calculator,
    },
    { 
      href: "/admin/services", 
      label: "Service Catalog", 
      icon: Settings,
    },
    { 
      href: "/admin/admins", 
      label: "Admins", 
      icon: ShieldCheck,
    },
    { 
      href: "/admin/activity-logs", 
      label: "Activity Logs", 
      icon: ScrollText,
    },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
      {/* Simple Logo Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img
            src="/assets/pgc-logo.png"
            alt="PGC Logo"
            className="h-8 w-auto object-contain"
          />
          <div>
            <h1 className="text-base font-semibold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
              GenomeBase
            </h1>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Clean Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive(href)
                    ? "bg-[#166FB5] text-white"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium flex-1">{label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {/* Simple User Profile */}
      {user && (
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || ""} />
              <AvatarFallback className="bg-[#166FB5] text-white text-sm">
                {user.displayName?.[0] ?? "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
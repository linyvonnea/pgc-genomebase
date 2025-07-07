// src/components/layout/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  Settings,
  FileText,
  FileBox,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  LibraryBig,
  MessageSquare
} from "lucide-react";
import { useState } from "react";

export function AdminSidebar() {
  const pathname = usePathname();
  const [isQuotationsOpen, setIsQuotationsOpen] = useState(true);

  const isActive = (href: string) => pathname === href;

  return (
    <SidebarProvider>
      <Sidebar className="min-h-screen">
        <SidebarContent>
          <SidebarHeader>
            <h1 className="text-lg font-semibold">PGC GenomeBase</h1>
          </SidebarHeader>

          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/admin/dashboard">
                <SidebarMenuButton isActive={isActive("/admin/dashboard")}> 
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/admin/clients">
                <SidebarMenuButton isActive={isActive("/admin/clients")}> 
                  <Users className="size-4" />
                  Clients
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/admin/projects">
                <SidebarMenuButton isActive={isActive("/admin/projects")}> 
                  <LibraryBig className="size-4" />
                  Projects
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/admin/inquiry">
                <SidebarMenuButton isActive={isActive("/admin/inquiry")}> 
                  <MessageSquare className="size-4" />
                  Inquiries
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            {/* Quotations with submenu */}
            <SidebarMenuItem>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-muted transition"
                onClick={() => setIsQuotationsOpen(!isQuotationsOpen)}
              >
                <FileText className="size-4" />
                <span className="flex-1 text-left">Quotations</span>
                {isQuotationsOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {isQuotationsOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  <Link href="/admin/quotations/laboratory">
                    <SidebarMenuButton
                      isActive={isActive("/admin/quotations/laboratory")}
                    >
                      <FileBox className="size-4" /> Laboratory
                    </SidebarMenuButton>
                  </Link>
                  <Link href="/admin/quotations/equipment">
                    <SidebarMenuButton
                      isActive={isActive("/admin/quotations/equipment")}
                    >
                      <FileBox className="size-4" /> Equipment
                    </SidebarMenuButton>
                  </Link>
                </div>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/admin/charge-slips">
                <SidebarMenuButton isActive={isActive("/admin/charge-slips")}> 
                  <FileText className="size-4" />
                  Charge Slips
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/admin/settings">
                <SidebarMenuButton isActive={isActive("/admin/settings")}> 
                  <Settings className="size-4" />
                  Settings
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
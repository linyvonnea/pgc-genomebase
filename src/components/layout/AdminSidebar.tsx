// src/components/layout/AdminSidebar.tsx
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
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  Settings,
  FileText,
  LayoutDashboard,
  LibraryBig,
  MessageSquare,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

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

            {/* Simplified Quotations */}
            <SidebarMenuItem>
              <Link href="/admin/quotations">
                <SidebarMenuButton isActive={isActive("/admin/quotations")}>
                  <FileText className="size-4" />
                  Quotations
                </SidebarMenuButton>
              </Link>
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
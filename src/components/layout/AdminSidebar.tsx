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
import useAuth from "@/hooks/useAuth";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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

          {/* Admin Info and Logout */}
          {user && (
            <div className="mt-auto px-4 py-6 border-t text-sm text-muted-foreground space-y-1">
              <div className="font-medium">{user.displayName}</div>
              <div className="truncate">{user.email}</div>
              <button
                onClick={signOut}
                className="text-blue-600 hover:underline text-sm"
              >
                Log out
              </button>
            </div>
          )}
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
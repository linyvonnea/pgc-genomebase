// AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
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
  LayoutDashboard,
  Users,
  LibraryBig,
  MessageSquare,
  FileText,
  Settings,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/projects", label: "Projects", icon: LibraryBig },
    { href: "/admin/inquiry", label: "Inquiries", icon: MessageSquare },
    { href: "/admin/quotations", label: "Quotations", icon: FileText },
    { href: "/admin/charge-slips", label: "Charge Slips", icon: FileText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="min-h-screen bg-white border-r">
        <SidebarContent className="flex flex-col h-full justify-between">
          {/* Logo Header */}
          <SidebarHeader className="flex items-center gap-3 px-4 py-6 border-b">
            <img
              src="/assets/pgc-logo.png"
              alt="PGC Logo"
              className="h-15 w-auto object-contain"
            />
            <h1 className="text-lg font-bold tracking-tight text-gray-800">
              GenomeBase
            </h1>
          </SidebarHeader>

          {/* Sidebar Menu */}
          <SidebarMenu className="mt-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <Link href={href}>
                  <SidebarMenuButton
                    isActive={isActive(href)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                      isActive(href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-muted hover:text-foreground/80"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          {/* Account Footer with Log Out Icon */}
          {user && (
            <div className="mt-auto px-4 py-6 border-t bg-gray-50">
              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback>
                      {user.displayName?.[0] ?? "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-sm">
                    <span className="font-medium truncate">{user.displayName}</span>
                    <span className="text-muted-foreground text-xs truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="text-red-600 hover:text-red-800 transition"
                  title="Log out"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            </div>
          )}
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
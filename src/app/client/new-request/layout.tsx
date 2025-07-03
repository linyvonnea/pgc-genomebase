// src/app/client/layout.tsx
import ClientLayout from "@/components/layout/ClientLayout";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  return (
  <SidebarProvider>
      <Sidebar>
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
        <ClientLayout>{children}</ClientLayout>
        </SidebarInset>
    </SidebarProvider>
  )
}





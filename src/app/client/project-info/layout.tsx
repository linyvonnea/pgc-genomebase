// src/app/Project/layout.tsx
import ProjectLayout from "@/components/layout/ProjectLayout";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function ProjectRootLayout({ children }: { children: React.ReactNode }) {
  return (
  <SidebarProvider>
      <Sidebar>
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
        <ProjectLayout>{children}</ProjectLayout>
        </SidebarInset>
    </SidebarProvider>
  )
}





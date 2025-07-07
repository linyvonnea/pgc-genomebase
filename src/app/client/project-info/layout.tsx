// src/app/Project/layout.tsx
import ProjectLayout from "@/components/layout/ProjectLayout";
import Header from "@/components/ui/header";

import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function ProjectRootLayout({ children }: { children: React.ReactNode }) {
  return (
        <div className="min-h-screen bg-gray-50">
          <Header />
          {/* Main Content */}
          <main className="px-6 py-8">
            {children}
          </main>
        </div>
      )
}





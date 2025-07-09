// src/app/client/layout.tsx
import ClientLayout from "@/components/layout/ClientLayout";
import Header from "@/components/ui/header";

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
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




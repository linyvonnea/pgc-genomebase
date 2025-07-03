// src/app/client/inquiry-request/layout.tsx
import Header from "@/components/ui/header";

export default function InquiryRequestLayout({ children }: { children: React.ReactNode }) {
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

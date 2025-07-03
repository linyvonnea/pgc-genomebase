// src/components/layout/ClientLayout.tsx
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">Client Information Sheet</h1>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
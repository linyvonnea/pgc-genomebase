// app/layout.tsx
import "@/app/globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { Toaster } from "@/components/ui/sonner";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PGC Visayas Service Request Portal",
  description: "Streamlined Service Request Portal for PGC Visayas",
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon.png", type: "image/png" },
  ],
},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Toaster/>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}

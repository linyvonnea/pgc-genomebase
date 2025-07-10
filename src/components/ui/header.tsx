// src/components/ui/header.tsx
import Image from "next/image";
import { LogOut, User } from "lucide-react";

export interface HeaderProps {
  showNavigation?: boolean;
  user?: {
    displayName?: string | null;
    email?: string | null;
  } | null;
  onLogout?: () => void;
}

export default function Header({ user, onLogout, showNavigation = true }: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center">
              <Image
                src="/assets/pgc-logo.png"
                alt="Philippine Genome Center Logo"
                width={120}
                height={75}
                className="object-contain"
              />
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                PHILIPPINE GENOME CENTER VISAYAS
              </div>
              <div className="text-xs text-slate-500 font-medium">
                UNIVERSITY OF THE PHILIPPINES VISAYAS, MIAGAO, ILOILO
              </div>
            </div>
          </div>

          {/* User Info and Logout */}
          {showNavigation && user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 bg-slate-50/80 rounded-full px-4 py-2 border border-slate-200">
                <div className="w-8 h-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-slate-800">{user.displayName}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>
              
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#B9273A] bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#B9273A]/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// src/components/ui/header.tsx
import Image from "next/image";

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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <Image
              src="/assets/pgc-logo.png"
              alt="Philippine Genome Center Logo"
              width={120}
              height={75}
            />
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium">
              PHILIPPINE GENOME CENTER VISAYAS
            </div>
            <div className="text-[10px] text-gray-500">
              UNIVERSITY OF THE PHILIPPINES VISAYAS, MIAGAO, ILOILO
            </div>
          </div>
        </div>

        {/* User Info and Logout */}
        {showNavigation && user && (
          <div className="flex gap-4 items-center text-sm text-gray-700">
            <span>{user.displayName}</span>
            <button
              onClick={onLogout}
              className="text-blue-600 hover:underline transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

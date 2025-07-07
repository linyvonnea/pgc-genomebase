import Image from "next/image";

interface HeaderProps {
  showNavigation?: boolean;
}

export default function Header({ showNavigation = true }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
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
        {showNavigation && (
          <div className="flex gap-4">
            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              Contact Us
            </button>
            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
interface HeaderProps {
  showNavigation?: boolean;
}

export default function Header({ showNavigation = true }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">PGC</span>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium">PHILIPPINE GENOME CENTER</div>
            <div className="text-xs text-gray-500">UNIVERSITY OF THE PHILIPPINES</div>
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
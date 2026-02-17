// src/components/ui/header.tsx
import Image from "next/image";
import { LogOut, User, Settings, Info, Key, ChevronDown } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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

          {/* User Dropdown Section */}
          {showNavigation && user && (
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 bg-white hover:bg-slate-50 rounded-full px-2 py-1.5 sm:px-4 sm:py-2 border border-slate-200 transition-all duration-200 hover:shadow-md focus:outline-none group">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden sm:block text-left mr-1">
                      <div className="font-semibold text-slate-800 text-sm leading-none">{user.displayName || "User"}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[120px]">{user.email}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-200 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-[200px] mt-2 p-1.5 rounded-xl border-slate-200" align="end">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    My Account
                  </DropdownMenuLabel>
                  
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4 text-[#166FB5]" />
                    <span className="font-medium">Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <Key className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Change Password</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <Info className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">About</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                  
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-[#B9273A] hover:bg-[#B9273A]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-bold">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/client/client-info", label: "Client Info" },
  { href: "/client/inquiry-request", label: "Inquiry Request" },
  { href: "/client/project-info", label: "Project Info" },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 border-r bg-white p-4 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-lg font-bold mb-6">Client Portal</h2>
        <nav className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block px-3 py-2 rounded hover:bg-gray-100",
                pathname.startsWith(link.href) ? "bg-gray-200 font-semibold" : ""
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {user && (
        <div className="text-xs text-gray-600 mt-6 border-t pt-4 space-y-1">
          <div className="font-medium">{user.displayName}</div>
          <div className="truncate">{user.email}</div>
          <button
            onClick={signOut}
            className="text-blue-600 hover:underline text-sm mt-1"
          >
            Log out
          </button>
        </div>
      )}
    </aside>
  );
}
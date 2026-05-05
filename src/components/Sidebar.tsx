"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, PlusCircle, BarChart3, BookOpen, Bell, LogOut, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/problems", label: "Problems", icon: PlusCircle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col h-screen sticky top-0">
      <Link href="/dashboard" className="text-xl font-bold mb-8 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
        Algo Loop
      </Link>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  );
}

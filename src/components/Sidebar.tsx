"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, PlusCircle, BarChart3, BookOpen, Bell, LogOut, CalendarCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/problems", label: "Problems", icon: PlusCircle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

type UserProfile = {
  name: string;
  username: string;
  avatar: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setProfile({
          name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
          username: user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email || "",
          avatar: user.user_metadata?.avatar_url || "",
        });
      }
    });
  }, []);

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

      {/* Profile Section */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
              {profile?.name?.[0] || "?"}
            </div>
          )}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-gray-500 truncate">@{profile?.username}</p>
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {showDropdown && (
          <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-gray-400">@{profile?.username}</p>
              <a
                href={`https://github.com/${profile?.username}`}
                target="_blank"
                rel="noopener"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                View GitHub Profile →
              </a>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

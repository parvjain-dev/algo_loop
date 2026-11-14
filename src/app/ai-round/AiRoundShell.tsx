"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

/** The home page gets the normal sidebar; a session gets the whole screen, like a real interview tool. */
export function AiRoundShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inSession = /^\/ai-round\/[^/]+$/.test(pathname);
  if (inSession) return <div className="min-h-screen">{children}</div>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

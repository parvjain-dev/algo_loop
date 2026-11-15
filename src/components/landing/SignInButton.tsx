"use client";

import { useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** GitHub sign-in. The only part of the landing page that needs the browser. */
export function SignInButton({ className, quiet = false }: { className?: string; quiet?: boolean }) {
  const [loading, setLoading] = useState(false);
  const signIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  };
  return (
    <button
      onClick={signIn}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-lg disabled:opacity-70 px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400",
        quiet
          ? "border border-gray-700 text-gray-200 hover:border-gray-500 hover:text-white"
          : "bg-green-600 hover:bg-green-700 text-white",
        className
      )}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <GitBranch size={18} />}
      Sign in with GitHub
    </button>
  );
}

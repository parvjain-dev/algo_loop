"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Algo Loop
        </h1>
        <p className="text-gray-400 text-lg max-w-md">
          Master DSA with spaced repetition. Track problems, build streaks, and never forget a pattern.
        </p>
      </div>
      <button
        onClick={handleLogin}
        className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
      >
        <GitBranch size={20} />
        Sign in with GitHub
      </button>
    </div>
  );
}

import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AiRoundHome, type KeySettings, type SessionRow } from "./AiRoundHome";

export default async function AiRoundPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Never select key_ciphertext here: nothing about the key leaves the server but its last 4 characters.
  const { data: settings } = await supabase
    .from("ai_keys")
    .select("provider, model, key_hint, verified_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: sessions, error } = await supabase
    .from("ai_sessions")
    .select("id, title, format_id, status, created_at, metrics")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <AiRoundHome
      settings={(settings as KeySettings) ?? null}
      sessions={(sessions as SessionRow[]) ?? []}
      setupMissing={Boolean(error)}
    />
  );
}

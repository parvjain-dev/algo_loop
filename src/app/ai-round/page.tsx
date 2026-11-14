import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AiRoundHome, type KeySettings, type SessionRow } from "./AiRoundHome";

/** Minutes left on a session's clock right now (0 once time is up). */
function minutesLeft(startedAt: string, durationSeconds: number): number {
  const endsAt = Date.parse(startedAt) + durationSeconds * 1000;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 60000));
}

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
    .select("id, title, format_id, status, created_at, metrics, started_at, duration_seconds")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <AiRoundHome
      settings={(settings as KeySettings) ?? null}
      sessions={(sessions ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        format_id: s.format_id,
        status: s.status,
        created_at: s.created_at,
        metrics: s.metrics,
        // Minutes left for unfinished sessions, worked out here so the label never changes between server and browser.
        minutesLeft:
          s.status === "active" ? minutesLeft(s.started_at, s.duration_seconds) : null,
      })) as SessionRow[]}
      setupMissing={Boolean(error)}
    />
  );
}

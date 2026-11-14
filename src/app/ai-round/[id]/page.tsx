import { createServerSupabase } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getFormat } from "@/lib/ai-round/formats";
import { renderEvent } from "@/lib/ai-round/review";
import type { Files, ProblemBundle, SessionEvent } from "@/lib/ai-round/types";
import { Workspace, type SessionData } from "./Workspace";
import { ReviewView } from "./ReviewView";

export default async function AiRoundSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: session } = await supabase
    .from("ai_sessions")
    .select("id, format_id, title, problem, files, phase, status, started_at, duration_seconds, metrics, review")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: eventRows } = await supabase
    .from("ai_events")
    .select("seq, type, t_ms, data")
    .eq("session_id", id)
    .order("seq", { ascending: true })
    .limit(2000);
  const events = (eventRows || []) as SessionEvent[];
  const format = getFormat(session.format_id);

  if (session.status === "finished") {
    // The reference solution is only loaded once the session is over.
    const { data: solution } = await supabase
      .from("ai_session_solutions")
      .select("files")
      .eq("session_id", id)
      .maybeSingle();
    const eventText = Object.fromEntries(events.map((e) => [e.seq, renderEvent(e)]));
    return (
      <ReviewView
        sessionId={session.id}
        title={session.title}
        format={format}
        problem={session.problem as ProblemBundle}
        finalFiles={session.files as Files}
        solution={(solution?.files as Files) ?? null}
        metrics={session.metrics}
        review={session.review}
        eventText={eventText}
      />
    );
  }

  const { data: key } = await supabase.from("ai_keys").select("provider").eq("user_id", user.id).maybeSingle();
  return <Workspace session={session as SessionData} events={events} hasKey={Boolean(key)} />;
}

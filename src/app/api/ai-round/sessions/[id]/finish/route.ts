import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import { computeMetrics } from "@/lib/ai-round/metrics";
import { REVIEW_SYSTEM, buildReviewPrompt, groundReview, headline } from "@/lib/ai-round/review";
import { parseJsonObject } from "@/lib/ai-round/server/providers";
import { completeForUser, jsonError, loadUserAi, requireUser } from "@/lib/ai-round/server/context";
import type { Files, ProblemBundle, SessionEvent } from "@/lib/ai-round/types";

export const maxDuration = 300;

/**
 * End the session (or re-run the review of a finished one). Metrics are
 * computed by code; the AI's review is grounded against the event log
 * before anything is saved.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data: session } = await supabase
    .from("ai_sessions")
    .select("id, format_id, status, problem, files, title")
    .eq("id", id)
    .maybeSingle();
  if (!session) return jsonError("Session not found", 404);

  const body = (await request.json().catch(() => ({}))) as { files?: Files };
  const finalFiles: Files = session.status === "active" && body.files ? body.files : (session.files as Files);

  if (session.status === "active") {
    await supabase
      .from("ai_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString(), files: finalFiles })
      .eq("id", id);
  }

  const { data: eventRows } = await supabase
    .from("ai_events")
    .select("seq, type, t_ms, data")
    .eq("session_id", id)
    .order("seq", { ascending: true })
    .limit(2000);
  const events = (eventRows || []) as SessionEvent[];

  const format = getFormat(session.format_id);
  const problem = session.problem as ProblemBundle;
  const metrics = computeMetrics(events, problem.phases.length, format.aiAllowed);

  let review = null;
  let reviewError: string | null = null;
  const ai = await loadUserAi(supabase, user.id);
  if (!ai) {
    reviewError = "Connect an AI key to get a written review. Your numbers below are complete.";
  } else {
    try {
      const text = await completeForUser(supabase, user.id, ai, {
        system: REVIEW_SYSTEM,
        messages: [
          {
            role: "user",
            content: buildReviewPrompt({
              format,
              problemTitle: session.title,
              phases: problem.phases,
              events,
              metrics,
              finalFiles,
              starterFiles: problem.files,
            }),
          },
        ],
        json: true,
        maxTokens: 4000,
        temperature: 0.2,
      });
      review = groundReview(parseJsonObject(text), { events, metrics, format, model: ai.model });
    } catch (err) {
      reviewError = `The written review couldn't be generated (${err instanceof Error ? err.message : "error"}). Try again from this page.`;
    }
  }

  const saved = review ?? { headline: headline(metrics, format), error: reviewError };
  await supabase.from("ai_sessions").update({ metrics, review: saved }).eq("id", id);
  return NextResponse.json({ metrics, review: saved });
}

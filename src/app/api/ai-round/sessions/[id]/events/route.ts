import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/ai-round/server/context";
import type { EventType, Files } from "@/lib/ai-round/types";

const TYPES: EventType[] = [
  "session_start",
  "phase_start",
  "clarify",
  "think_first",
  "test_run",
  "ai_user",
  "ai_reply",
  "paste",
  "phase_complete",
  "closing",
  "session_end",
];
const MAX_EVENT_BYTES = 20_000;
const MAX_FILES_BYTES = 200_000;

/** Append events (idempotent by seq) and save the latest code and phase. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data: session } = await supabase.from("ai_sessions").select("id, status").eq("id", id).maybeSingle();
  if (!session) return jsonError("Session not found", 404);
  if (session.status !== "active") return jsonError("Session already finished", 409);

  const body = (await request.json().catch(() => ({}))) as {
    events?: { seq: number; type: EventType; t_ms: number; data?: Record<string, unknown> }[];
    files?: Files;
    phase?: number;
  };

  const rows = (body.events || [])
    .filter(
      (e) =>
        Number.isInteger(e.seq) &&
        e.seq >= 0 &&
        TYPES.includes(e.type) &&
        Number.isFinite(e.t_ms) &&
        JSON.stringify(e.data || {}).length <= MAX_EVENT_BYTES
    )
    .map((e) => ({
      session_id: id,
      user_id: user.id,
      seq: e.seq,
      type: e.type,
      t_ms: Math.max(0, Math.round(e.t_ms)),
      data: e.data || {},
    }));
  if (rows.length) {
    const { error } = await supabase
      .from("ai_events")
      .upsert(rows, { onConflict: "session_id,seq", ignoreDuplicates: true });
    if (error) return jsonError("Couldn't save events", 500);
  }

  const update: Record<string, unknown> = {};
  if (body.files && JSON.stringify(body.files).length <= MAX_FILES_BYTES) update.files = body.files;
  if (Number.isInteger(body.phase) && body.phase! >= 1) update.phase = body.phase;
  if (Object.keys(update).length) await supabase.from("ai_sessions").update(update).eq("id", id);

  return NextResponse.json({ ok: true });
}

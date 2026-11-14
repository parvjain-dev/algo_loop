import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import { type ChatMessage } from "@/lib/ai-round/server/providers";
import { completeForUser, jsonError, loadUserAi, providerErrorResponse, requireUser } from "@/lib/ai-round/server/context";
import type { Files, ProblemBundle } from "@/lib/ai-round/types";

export const maxDuration = 120;

const SYSTEM = `You are the AI assistant built into a coding-interview environment, like the chat panel in an AI-assisted coding round.
- You can read the project files below but you cannot edit them; the candidate makes every change.
- Help like a good senior engineer pair: explain code, answer questions, suggest approaches, and write code when asked.
- Be accurate and concise. Use fenced code blocks for code. If you are unsure, say so instead of guessing.
- Do not mention that this is practice, and do not grade the candidate.`;

const MAX_CONTEXT = 80_000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data: session } = await supabase
    .from("ai_sessions")
    .select("format_id, status, phase, problem")
    .eq("id", id)
    .maybeSingle();
  if (!session) return jsonError("Session not found", 404);
  if (session.status !== "active") return jsonError("Session already finished", 409);
  if (!getFormat(session.format_id).aiAllowed) return jsonError("The AI is off in this format.", 403);

  const ai = await loadUserAi(supabase, user.id);
  if (!ai) return jsonError("Connect an AI key first.");

  const body = (await request.json().catch(() => ({}))) as { history?: ChatMessage[]; files?: Files };
  const history = (body.history || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!history.length || history.at(-1)!.role !== "user") return jsonError("Nothing to answer");

  const problem = session.problem as ProblemBundle;
  const phase = problem.phases[Math.min(session.phase, problem.phases.length) - 1];
  let context = "";
  for (const [path, content] of Object.entries(body.files || {})) {
    const block = `\n--- ${path}\n${content}\n`;
    if (context.length + block.length > MAX_CONTEXT) break;
    context += block;
  }

  try {
    const reply = await completeForUser(supabase, user.id, ai, {
      system: `${SYSTEM}\n\nCurrent task (${phase?.title}):\n${phase?.brief}\n\nProject files:${context}`,
      messages: history,
      maxTokens: 3000,
      temperature: 0.3,
      timeoutMs: 100_000,
      lightThinking: true,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    return providerErrorResponse(err);
  }
}

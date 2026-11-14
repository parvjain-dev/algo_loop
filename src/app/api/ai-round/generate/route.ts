import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import { GENERATOR_SYSTEM, checkGeneratedShape, generatorPrompt } from "@/lib/ai-round/generate";
import { parseJsonObject } from "@/lib/ai-round/server/providers";
import { completeForUser, jsonError, loadUserAi, providerErrorResponse, requireUser } from "@/lib/ai-round/server/context";

export const maxDuration = 300;

/**
 * Ask the user's AI for a problem and check its shape. The browser then RUNS
 * it (starter must fail, solution must pass) before the student sees it, and
 * calls back here with `feedback` if it didn't hold up.
 */
export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);
  const ai = await loadUserAi(supabase, user.id);
  if (!ai) return jsonError("Connect an AI key first.");

  const body = (await request.json().catch(() => ({}))) as { formatId?: string; topic?: string; feedback?: string };
  let format;
  try {
    format = getFormat(body.formatId || "");
  } catch {
    return jsonError("Unknown format");
  }
  const topic = (body.topic || "").slice(0, 120);
  const feedback = (body.feedback || "").slice(0, 3000);

  // One attempt per request: a generation can take a few minutes, and the
  // browser retries with feedback (bad JSON or failed test check) on 422.
  let text: string;
  try {
    text = await completeForUser(supabase, user.id, ai, {
      system: GENERATOR_SYSTEM,
      messages: [{ role: "user", content: generatorPrompt(format, topic, feedback) }],
      json: true,
      maxTokens: 24000,
      temperature: 0.7,
      timeoutMs: 270_000,
      lightThinking: true,
    });
  } catch (err) {
    return providerErrorResponse(err);
  }
  try {
    const problem = checkGeneratedShape(parseJsonObject(text), format.phaseCount);
    return NextResponse.json({ problem });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid JSON";
    return NextResponse.json({ error: `The AI's problem wasn't usable (${reason}).`, retry: `The JSON was not usable: ${reason}` }, { status: 422 });
  }
}

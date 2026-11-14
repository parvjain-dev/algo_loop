import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import {
  GENERATOR_SYSTEM,
  REPAIR_SYSTEM,
  checkGeneratedShape,
  generatorPrompt,
  mergeRepair,
  repairPrompt,
  toRawProblem,
} from "@/lib/ai-round/generate";
import { parseJsonObject } from "@/lib/ai-round/server/providers";
import { completeForUser, jsonError, loadUserAi, providerErrorResponse, requireUser } from "@/lib/ai-round/server/context";
import type { GeneratedProblem } from "@/lib/ai-round/types";

export const maxDuration = 300;

/**
 * Write a problem with the user's AI, or repair one that failed the browser's
 * check. A repair sends the problem back with the exact reason and asks for
 * only the changed files, which is far faster than writing a new one.
 *
 * One AI call per request: a generation can take minutes, and the browser
 * drives retries (422 = unusable output, try again with the reason).
 */
export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);
  const ai = await loadUserAi(supabase, user.id);
  if (!ai) return jsonError("Connect an AI key first.");

  const body = (await request.json().catch(() => ({}))) as {
    formatId?: string;
    topic?: string;
    feedback?: string;
    repair?: { problem?: GeneratedProblem; reason?: string };
  };
  let format;
  try {
    format = getFormat(body.formatId || "");
  } catch {
    return jsonError("Unknown format");
  }

  // ---------- repair ----------
  if (body.repair?.problem && body.repair.reason) {
    let base: GeneratedProblem;
    try {
      // Never trust the client's copy: re-check it before building on it.
      base = checkGeneratedShape(toRawProblem(body.repair.problem), format.phaseCount);
    } catch {
      return jsonError("The problem to repair isn't valid.");
    }
    const reason = body.repair.reason.slice(0, 3000);
    let text: string;
    try {
      text = await completeForUser(supabase, user.id, ai, {
        system: REPAIR_SYSTEM,
        messages: [{ role: "user", content: repairPrompt(base, reason) }],
        json: true,
        maxTokens: 16000,
        temperature: 0.3,
        timeoutMs: 240_000,
        lightThinking: true,
      });
    } catch (err) {
      return providerErrorResponse(err);
    }
    try {
      const problem = checkGeneratedShape(mergeRepair(base, parseJsonObject(text)), format.phaseCount);
      return NextResponse.json({ problem, repaired: true });
    } catch (err) {
      const why = err instanceof Error ? err.message : "invalid JSON";
      return NextResponse.json({ error: `The AI's fix wasn't usable (${why}).`, retry: reason, repairFailed: true }, { status: 422 });
    }
  }

  // ---------- new problem ----------
  const topic = (body.topic || "").slice(0, 120);
  const feedback = (body.feedback || "").slice(0, 3000);
  let text: string;
  try {
    text = await completeForUser(supabase, user.id, ai, {
      system: GENERATOR_SYSTEM,
      messages: [{ role: "user", content: generatorPrompt(format, topic, feedback) }],
      json: true,
      maxTokens: 20000,
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
    return NextResponse.json(
      { error: `The AI's problem wasn't usable (${reason}).`, retry: `The JSON was not usable: ${reason}` },
      { status: 422 }
    );
  }
}

import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import { GENERATOR_SYSTEM, checkGeneratedShape, generatorPrompt } from "@/lib/ai-round/generate";
import { complete, parseJsonObject } from "@/lib/ai-round/server/providers";
import { jsonError, loadUserAi, providerErrorResponse, requireUser } from "@/lib/ai-round/server/context";

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

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await complete({
        ...ai,
        system: GENERATOR_SYSTEM,
        messages: [
          {
            role: "user",
            content: generatorPrompt(format, topic, feedback || (lastError ? `The JSON was not usable: ${lastError}` : "")),
          },
        ],
        json: true,
        maxTokens: 16000,
        temperature: 0.7,
      });
    } catch (err) {
      return providerErrorResponse(err);
    }
    try {
      const problem = checkGeneratedShape(parseJsonObject(text), format.phaseCount);
      return NextResponse.json({ problem });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "invalid JSON";
    }
  }
  return jsonError(`The AI couldn't produce a usable problem (${lastError}). Try again or pick another model.`, 502);
}

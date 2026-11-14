import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptKey } from "@/lib/ai-round/server/crypto";
import { ProviderError, complete, listModels, type CompleteOptions } from "@/lib/ai-round/server/providers";
import type { Provider } from "@/lib/ai-round/types";

export async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export type UserAi = { provider: Provider; model: string; key: string };

/** The signed-in user's AI settings with the key decrypted. Server only. */
export async function loadUserAi(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string
): Promise<UserAi | null> {
  const { data } = await supabase
    .from("ai_keys")
    .select("provider, model, key_ciphertext")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { provider: data.provider as Provider, model: data.model, key: decryptKey(data.key_ciphertext) };
}

const MODEL_GONE = /no longer available|not found|deprecated|retired|does not exist|not supported/i;

function modelGone(err: unknown): boolean {
  return err instanceof ProviderError && (err.status === 404 || MODEL_GONE.test(err.message));
}

const BUSY = /high demand|overloaded|unavailable|try again later|temporarily|capacity/i;

/** The provider is temporarily overloaded (not a problem with the key or the request). */
export function providerBusy(err: unknown): boolean {
  return (
    err instanceof ProviderError &&
    err.status !== 429 &&
    (err.status === 503 || err.status === 529 || err.status === 500 || BUSY.test(err.message))
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Same family first (a busy Flash model falls back to another Flash model), then anything else. */
function fallbackOrder(models: string[], current: string): string[] {
  const family = /flash-lite/.test(current) ? /flash-lite/ : /flash/.test(current) ? /flash(?!-lite)/ : /pro/.test(current) ? /pro/ : /mini/.test(current) ? /mini/ : /sonnet/.test(current) ? /sonnet/ : null;
  const others = models.filter((m) => m !== current);
  return family ? [...others.filter((m) => family.test(m)), ...others.filter((m) => !family.test(m))] : others;
}

/**
 * Call the user's model, recovering from the two provider problems that
 * aren't the student's fault:
 *  - retired model: switch to the newest model the key can use, save it, retry;
 *  - temporary overload ("high demand"): retry after a short pause, then try a
 *    similar model for this request only (the saved choice is kept).
 * Retries only happen early in a request, so slow calls never stack past the
 * route's time limit.
 */
export async function completeForUser(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  ai: UserAi,
  opts: Omit<CompleteOptions, "provider" | "key" | "model">
): Promise<string> {
  const started = Date.now();
  const canRetry = () => Date.now() - started < 120_000;
  const tryModel = async (model: string, busyRetries: number[]): Promise<string> => {
    for (let i = 0; ; i++) {
      try {
        return await complete({ ...ai, model, ...opts });
      } catch (err) {
        if (!providerBusy(err) || i >= busyRetries.length || !canRetry()) throw err;
        await sleep(busyRetries[i]);
      }
    }
  };

  try {
    return await tryModel(ai.model, [3000, 8000]);
  } catch (err) {
    if (modelGone(err)) {
      const next = (await listModels(ai.provider, ai.key)).find((m) => m !== ai.model);
      if (!next) throw err;
      await supabase.from("ai_keys").update({ model: next }).eq("user_id", userId);
      return tryModel(next, [3000]);
    }
    if (providerBusy(err) && canRetry()) {
      const models = await listModels(ai.provider, ai.key).catch(() => [] as string[]);
      for (const m of fallbackOrder(models, ai.model).slice(0, 2)) {
        try {
          return await tryModel(m, []);
        } catch (e) {
          if (!providerBusy(e) && !modelGone(e)) throw e;
          if (!canRetry()) break;
        }
      }
    }
    throw err;
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Turn provider failures into messages a student can act on. Never echoes the key. */
export function providerErrorResponse(err: unknown) {
  if (err instanceof ProviderError) {
    if (err.status === 401 || err.status === 403)
      return jsonError("Your AI provider rejected the key. Check it in AI Round settings.", 401);
    if (modelGone(err))
      return jsonError(
        "Your selected model isn't available on your key anymore. Pick another model under Your AI on the AI Round page.",
        400
      );
    if (providerBusy(err))
      return jsonError(
        "Your AI provider is overloaded right now (on their side, not yours). We retried and tried another model. Wait a minute and try again.",
        503
      );
    if (err.status === 429)
      return jsonError("Your AI provider's rate limit or quota was hit. Wait a minute and try again.", 429);
    return jsonError(`AI provider error: ${err.message}`, 502);
  }
  if (err instanceof Error && err.name === "TimeoutError")
    return jsonError(
      "The AI took too long to answer. Try again, pick a Flash or mini model under Your AI, or use the curated problem.",
      504
    );
  return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
}

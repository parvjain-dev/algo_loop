import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptKey } from "@/lib/ai-round/server/crypto";
import { ProviderError } from "@/lib/ai-round/server/providers";
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

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Turn provider failures into messages a student can act on. Never echoes the key. */
export function providerErrorResponse(err: unknown) {
  if (err instanceof ProviderError) {
    if (err.status === 401 || err.status === 403)
      return jsonError("Your AI provider rejected the key. Check it in AI Round settings.", 401);
    if (err.status === 429)
      return jsonError("Your AI provider's rate limit or quota was hit. Wait a minute and try again.", 429);
    return jsonError(`AI provider error: ${err.message}`, 502);
  }
  if (err instanceof Error && err.name === "TimeoutError") return jsonError("The AI provider took too long to answer.", 504);
  return jsonError(err instanceof Error ? err.message : "Unexpected error", 500);
}

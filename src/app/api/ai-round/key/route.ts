import { NextResponse } from "next/server";
import { encryptKey, keyHint } from "@/lib/ai-round/server/crypto";
import { listModels } from "@/lib/ai-round/server/providers";
import { jsonError, loadUserAi, providerErrorResponse, requireUser } from "@/lib/ai-round/server/context";
import type { Provider } from "@/lib/ai-round/types";

const PROVIDERS: Provider[] = ["gemini", "openai", "anthropic"];

/** Current settings. The key itself is never returned. */
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);
  const { data } = await supabase
    .from("ai_keys")
    .select("provider, model, key_hint, verified_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ settings: data ?? null });
}

/** Validate a key with the provider (lists models, spends no tokens), then store it encrypted. */
export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);

  const body = (await request.json().catch(() => ({}))) as { provider?: string; apiKey?: string };
  const provider = body.provider as Provider;
  const apiKey = (body.apiKey || "").trim();
  if (!PROVIDERS.includes(provider)) return jsonError("Choose Gemini, OpenAI or Claude.");
  if (apiKey.length < 20 || /\s/.test(apiKey)) return jsonError("That doesn't look like an API key.");

  let models: string[];
  try {
    models = await listModels(provider, apiKey);
  } catch (err) {
    return providerErrorResponse(err);
  }
  if (!models.length) return jsonError("The key works, but no chat models are available on it.");

  const { error } = await supabase.from("ai_keys").upsert({
    user_id: user.id,
    provider,
    model: models[0],
    key_ciphertext: encryptKey(apiKey),
    key_hint: keyHint(apiKey),
    verified_at: new Date().toISOString(),
  });
  if (error) return jsonError("Couldn't save the key. Did you run supabase-ai-round.sql?", 500);

  return NextResponse.json({ settings: { provider, model: models[0], key_hint: keyHint(apiKey) }, models });
}

/** Change model (must be one the key can use) or list models again. */
export async function PATCH(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);
  const ai = await loadUserAi(supabase, user.id);
  if (!ai) return jsonError("Connect a key first.");

  const body = (await request.json().catch(() => ({}))) as { model?: string };
  let models: string[];
  try {
    models = await listModels(ai.provider, ai.key);
  } catch (err) {
    return providerErrorResponse(err);
  }
  if (body.model) {
    if (!models.includes(body.model)) return jsonError("That model isn't available on your key.");
    await supabase.from("ai_keys").update({ model: body.model }).eq("user_id", user.id);
  }
  return NextResponse.json({ models, model: body.model || ai.model });
}

export async function DELETE() {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);
  await supabase.from("ai_keys").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

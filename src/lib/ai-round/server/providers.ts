import type { Provider } from "@/lib/ai-round/types";

/**
 * Thin adapters over each provider's REST API. Only ever called from route
 * handlers with a key decrypted on the server.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class ProviderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 90_000;

async function call(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body as { error?: { message?: string } })?.error?.message ||
      (typeof body === "string" ? body.slice(0, 200) : `HTTP ${res.status}`);
    throw new ProviderError(msg, res.status);
  }
  return body;
}

/** Models the key can use, best first. Doubles as key validation (no tokens spent). */
export async function listModels(provider: Provider, key: string): Promise<string[]> {
  if (provider === "gemini") {
    const body = (await call("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": key },
    })) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = (body.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^gemini-/.test(n) && !/(embedding|image|tts|audio|live|vision|robotics|computer-use)/.test(n));
    return rankByVersion(names, {
      alias: /^gemini-flash-latest$/,
      family: (n) => (/-flash-lite/.test(n) ? 2 : /-flash/.test(n) ? 0 : /-pro/.test(n) ? 1 : 3),
    });
  }
  if (provider === "openai") {
    const body = (await call("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    })) as { data?: { id: string }[] };
    const names = (body.data || [])
      .map((m) => m.id)
      .filter((n) => /^(gpt-|o\d)/.test(n) && !/(audio|realtime|transcribe|tts|image|search|instruct)/.test(n));
    return rankByVersion(names, {
      family: (n) => (/^o\d/.test(n) ? 4 : /-mini/.test(n) ? 0 : /-nano/.test(n) ? 2 : /-(pro|chat|codex)/.test(n) ? 3 : 1),
    });
  }
  const body = (await call("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  })) as { data?: { id: string }[] };
  const names = (body.data || []).map((m) => m.id);
  return rank(names, [/sonnet/, /haiku/, /opus/]);
}

/**
 * Newest stable model first, so the default never points at a retired model.
 * Order: an always-latest alias if offered, then stable before preview/
 * experimental/dated snapshots, then the highest version number, then family.
 */
export function rankByVersion(
  names: string[],
  opts: { alias?: RegExp; family: (name: string) => number }
): string[] {
  const version = (n: string) => Number(n.match(/^(?:gemini|gpt)-(\d+(?:\.\d+)?)/)?.[1] ?? -1);
  const unstable = (n: string) => (/(preview|exp|experimental|-\d{4}-\d{2}-\d{2}|-\d{2}-\d{2}$|latest$)/.test(n) ? 1 : 0);
  const key = (n: string): number[] => [opts.alias?.test(n) ? 0 : 1, unstable(n), -version(n), opts.family(n), n.length];
  return [...new Set(names)].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return a.localeCompare(b);
  });
}

function rank(names: string[], prefs: RegExp[]): string[] {
  const score = (n: string) => {
    const i = prefs.findIndex((p) => p.test(n));
    return i === -1 ? prefs.length : i;
  };
  return [...new Set(names)].sort((a, b) => score(a) - score(b) || b.localeCompare(a));
}

export type CompleteOptions = {
  provider: Provider;
  key: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** How long to wait for the provider. Long outputs (problem generation) need more. */
  timeoutMs?: number;
  /**
   * Ask "thinking" models to think briefly. Problem generation and reviews
   * don't need long hidden reasoning, and it can take minutes on newer models.
   */
  lightThinking?: boolean;
};

/** Gemini thinking settings by model generation; null when unknown (leave the default). */
function geminiThinking(model: string): Record<string, unknown> | null {
  if (/^gemini-([3-9]|\d{2})/.test(model)) return { thinkingLevel: "low" };
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/^gemini-2\.5-pro/.test(model)) return { thinkingBudget: 128 };
  return null;
}

export async function complete(o: CompleteOptions): Promise<string> {
  const maxTokens = o.maxTokens ?? 2048;
  if (o.provider === "gemini") {
    const thinking = o.lightThinking ? geminiThinking(o.model) : null;
    const request = (withThinking: boolean) =>
      call(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": o.key, "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: o.system }] },
            contents: o.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: o.temperature ?? 0.4,
              ...(o.json ? { responseMimeType: "application/json" } : {}),
              ...(withThinking && thinking ? { thinkingConfig: thinking } : {}),
            },
          }),
        },
        o.timeoutMs
      );
    let raw: unknown;
    try {
      raw = await request(true);
    } catch (err) {
      // A model that doesn't accept this thinking setting: retry with its default.
      if (thinking && err instanceof ProviderError && err.status === 400 && /think/i.test(err.message)) raw = await request(false);
      else throw err;
    }
    const body = raw as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] };
    const cand = body.candidates?.[0];
    const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (!text) throw new ProviderError(`Empty response (${cand?.finishReason || "no candidates"})`, 502);
    if (cand?.finishReason === "MAX_TOKENS" && o.json)
      throw new ProviderError("The model ran out of output space before finishing. Try again or pick another model.", 502);
    return text;
  }
  if (o.provider === "openai") {
    const body = (await call("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${o.key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: o.model,
        messages: [{ role: "system", content: o.system }, ...o.messages],
        max_completion_tokens: maxTokens,
        ...(/^o\d|^gpt-5/.test(o.model) ? {} : { temperature: o.temperature ?? 0.4 }),
        ...(o.lightThinking && /^o\d|^gpt-5/.test(o.model) ? { reasoning_effort: "low" } : {}),
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
      }),
    }, o.timeoutMs)) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content || "";
    if (!text) throw new ProviderError("Empty response", 502);
    return text;
  }
  const body = (await call("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": o.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: o.model,
      system: o.json ? `${o.system}\n\nRespond with a single JSON object and nothing else.` : o.system,
      messages: o.messages,
      max_tokens: maxTokens,
      temperature: o.temperature ?? 0.4,
    }),
  }, o.timeoutMs)) as { content?: { type: string; text?: string }[] };
  const text = (body.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("");
  if (!text) throw new ProviderError("Empty response", 502);
  return text;
}

/** Parse a JSON object from a model reply, tolerating code fences or stray text around it. */
export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return JSON");
  }
}

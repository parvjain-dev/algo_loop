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

const TIMEOUT_MS = 120_000;

async function call(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
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
      .filter((n) => /^gemini-/.test(n) && !/(embedding|image|tts|audio|live|vision)/.test(n));
    return rank(names, [/^gemini-2\.5-flash$/, /^gemini-2\.5-pro$/, /flash/, /pro/]);
  }
  if (provider === "openai") {
    const body = (await call("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    })) as { data?: { id: string }[] };
    const names = (body.data || [])
      .map((m) => m.id)
      .filter((n) => /^(gpt-|o\d)/.test(n) && !/(audio|realtime|transcribe|tts|image|search|instruct)/.test(n));
    return rank(names, [/^gpt-4\.1-mini$/, /^gpt-4\.1$/, /^gpt-4o-mini$/, /^gpt-4o$/, /^gpt-5/]);
  }
  const body = (await call("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  })) as { data?: { id: string }[] };
  const names = (body.data || []).map((m) => m.id);
  return rank(names, [/sonnet/, /haiku/, /opus/]);
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
};

export async function complete(o: CompleteOptions): Promise<string> {
  const maxTokens = o.maxTokens ?? 2048;
  if (o.provider === "gemini") {
    const body = (await call(
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
          },
        }),
      }
    )) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
    const cand = body.candidates?.[0];
    const text = (cand?.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new ProviderError(`Empty response (${cand?.finishReason || "no candidates"})`, 502);
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
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
      }),
    })) as { choices?: { message?: { content?: string } }[] };
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
  })) as { content?: { type: string; text?: string }[] };
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

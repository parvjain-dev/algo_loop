"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { Bot, CheckCircle2, ExternalLink, KeyRound, Loader2, Play, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { FORMATS, HOW_COMPANIES_TEST, SOURCES, SOURCES_CHECKED, type Format } from "@/lib/ai-round/formats";
import { PythonRunner } from "@/lib/ai-round/runner";
import { validateByRunning } from "@/lib/ai-round/validate";
import type { GeneratedProblem, Provider } from "@/lib/ai-round/types";
import type { Metrics } from "@/lib/ai-round/metrics";
import { cn } from "@/lib/utils";

export type KeySettings = { provider: Provider; model: string; key_hint: string; verified_at: string };
export type SessionRow = {
  id: string;
  title: string;
  format_id: string;
  status: string;
  created_at: string;
  metrics: Metrics | null;
};

const PROVIDERS: { id: Provider; name: string; keyUrl: string; note: string }[] = [
  { id: "gemini", name: "Gemini", keyUrl: "https://aistudio.google.com/apikey", note: "Free tier available" },
  { id: "openai", name: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", note: "Paid, pay as you go" },
  { id: "anthropic", name: "Claude", keyUrl: "https://console.anthropic.com/settings/keys", note: "Paid, pay as you go" },
];

const MAX_ATTEMPTS = 3;

export function SourceBadge({ source }: { source: string }) {
  const s = SOURCES[source];
  if (!s) return null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener"
      className={cn(
        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap",
        s.kind === "official"
          ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
          : "border-amber-500/40 text-amber-300 bg-amber-500/10"
      )}
      title={s.label}
    >
      {s.kind === "official" ? "Official" : "Reported"} <ExternalLink size={10} />
    </a>
  );
}

export function AiRoundHome({
  settings: initialSettings,
  sessions,
  setupMissing,
}: {
  settings: KeySettings | null;
  sessions: SessionRow[];
  setupMissing: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [provider, setProvider] = useState<Provider>(initialSettings?.provider ?? "gemini");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState("");

  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<string>("");
  const [startError, setStartError] = useState("");
  const [busy, setBusy] = useState(false);
  const runnerRef = useRef<PythonRunner | null>(null);

  const selected = FORMATS.find((f) => f.id === formatId)!;

  useEffect(() => () => runnerRef.current?.dispose(), []);

  useEffect(() => {
    if (!initialSettings) return;
    fetch("/api/ai-round/key", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((d) => d.models && setModels(d.models))
      .catch(() => {});
  }, [initialSettings]);

  const saveKey = async () => {
    setKeyBusy(true);
    setKeyError("");
    const res = await fetch("/api/ai-round/key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    setKeyBusy(false);
    if (!res.ok) {
      setKeyError(data.error || "Couldn't verify the key.");
      return;
    }
    setApiKey("");
    setSettings({ ...data.settings, verified_at: new Date().toISOString() });
    setModels(data.models || []);
  };

  const changeModel = async (model: string) => {
    const res = await fetch("/api/ai-round/key", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model }),
    });
    if (res.ok && settings) setSettings({ ...settings, model });
  };

  const removeKey = async () => {
    if (!confirm("Remove your AI key from Algo Loop?")) return;
    await fetch("/api/ai-round/key", { method: "DELETE" });
    setSettings(null);
    setModels([]);
  };

  const createSession = async (source: "curated" | "generated", problem?: GeneratedProblem) => {
    const res = await fetch("/api/ai-round/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatId, source, problem }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't start the session");
    router.push(`/ai-round/${data.id}`);
  };

  const startCurated = async () => {
    setBusy(true);
    setStartError("");
    try {
      await createSession("curated");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start");
      setBusy(false);
    }
  };

  const startGenerated = async () => {
    setBusy(true);
    setStartError("");
    runnerRef.current ??= new PythonRunner();
    const runner = runnerRef.current;
    let feedback = "";
    try {
      setStatus("Loading Python in your browser…");
      const warm = runner.ready();
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setStatus(`Writing a ${selected.name} problem with your AI${attempt > 1 ? ` (attempt ${attempt} of ${MAX_ATTEMPTS})` : ""}…`);
        const res = await fetch("/api/ai-round/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ formatId, topic, feedback }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Generation failed");
        await warm;
        setStatus("Checking the problem really works: the starter must fail and the hidden solution must pass…");
        const reason = await validateByRunning(data.problem, (files, targets) => runner.run(files, targets));
        if (!reason) {
          setStatus("Problem verified. Starting…");
          await createSession("generated", data.problem);
          return;
        }
        feedback = reason;
      }
      throw new Error(
        `The AI's problems didn't pass the check after ${MAX_ATTEMPTS} tries (last issue: ${feedback.split("\n")[0]}). Try again, pick a stronger model, or use the curated problem.`
      );
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start");
      setStatus("");
      setBusy(false);
    }
  };

  const providerInfo = PROVIDERS.find((p) => p.id === (settings?.provider ?? provider))!;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot size={24} /> AI Round
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Practise the AI-assisted coding rounds companies now run: a real multi-file codebase, tests, and an AI
          assistant beside you. At the end you get a review that only says what your session actually shows.
        </p>
      </div>

      {setupMissing && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg p-3">
          AI Round tables aren&apos;t set up yet. Run <code>supabase-ai-round.sql</code> in the Supabase SQL editor.
        </div>
      )}

      {/* How companies test */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">How companies run these rounds</h2>
          <span className="text-xs text-gray-500">Sources checked {formatDate(new Date(SOURCES_CHECKED), "d MMM yyyy")}</span>
        </div>
        <ul className="space-y-2">
          {HOW_COMPANIES_TEST.map((h, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-20 shrink-0 font-medium text-gray-200">{h.company}</span>
              <span className="flex-1 text-gray-300">{h.line}</span>
              <SourceBadge source={h.source} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">
          Formats change and differ by team. Always confirm the exact format with your recruiter.
        </p>
      </section>

      {/* Connect AI */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} />
          <h2 className="font-semibold">Your AI</h2>
        </div>
        {settings ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 size={16} /> Connected: {PROVIDERS.find((p) => p.id === settings.provider)?.name}
              {settings.key_hint && <span className="text-gray-500">(…{settings.key_hint})</span>}
            </span>
            <label className="flex items-center gap-2 text-gray-400">
              Model
              <select
                value={settings.model}
                onChange={(e) => changeModel(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-100"
              >
                {[settings.model, ...models.filter((m) => m !== settings.model)].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={removeKey} className="inline-flex items-center gap-1 text-red-300 hover:text-red-200 ml-auto">
              <Trash2 size={14} /> Remove key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    provider === p.id ? "border-green-500 bg-green-900/30" : "border-gray-700 bg-gray-800 hover:border-gray-500"
                  )}
                >
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-xs text-gray-400">{p.note}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${providerInfo.name} API key`}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <button
                onClick={saveKey}
                disabled={keyBusy || apiKey.trim().length < 20}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {keyBusy && <Loader2 size={14} className="animate-spin" />} Verify & save
              </button>
            </div>
            {keyError && <p className="text-sm text-red-400">{keyError}</p>}
            <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
              <a href={providerInfo.keyUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">
                Get a {providerInfo.name} key →
              </a>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} /> Checked with your provider, stored encrypted, only used on our server, never shown
                again.
              </span>
            </p>
          </div>
        )}
      </section>

      {/* Formats */}
      <section className="space-y-3">
        <h2 className="font-semibold">Choose a format</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FORMATS.map((f) => (
            <FormatCard key={f.id} format={f} selected={f.id === formatId} onSelect={() => setFormatId(f.id)} />
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="text-sm text-gray-300">
            <span className="font-medium text-white">{selected.name}</span> · {selected.minutes} min ·{" "}
            {selected.aiAllowed ? "AI chat on (it can read your files, not edit them)" : "AI off"}
            {selected.clarifyStep && " · clarify before the AI unlocks"}
          </div>
          <div className="flex flex-wrap gap-3">
            {selected.curated && (
              <button
                disabled={busy || (selected.aiAllowed && !settings)}
                title={selected.aiAllowed && !settings ? "Connect your AI first" : ""}
                onClick={startCurated}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-500 text-sm disabled:opacity-50"
              >
                <Play size={14} /> Curated: Log Analyzer
              </button>
            )}
            <div className="flex flex-1 min-w-[280px] gap-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={busy}
                placeholder="Optional domain, e.g. ride-sharing, ticketing"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <button
                disabled={busy || !settings}
                onClick={startGenerated}
                title={settings ? "" : "Connect your AI first"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {busy && status ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate new
              </button>
            </div>
          </div>
          {status && <p className="text-sm text-sky-300">{status}</p>}
          {startError && <p className="text-sm text-red-400">{startError}</p>}
          {!settings && (
            <p className="text-xs text-gray-500">
              Without a key you can still do the curated problem in Solo. Other formats need your AI for the chat; the
              written review needs it too.
            </p>
          )}
        </div>
      </section>

      {/* History */}
      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Your sessions</h2>
          <div className="space-y-2">
            {sessions.map((s) => {
              const f = FORMATS.find((x) => x.id === s.format_id);
              return (
                <Link
                  key={s.id}
                  href={`/ai-round/${s.id}`}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600"
                >
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {f?.name} · {formatDate(new Date(s.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {s.status === "active"
                      ? "In progress"
                      : s.metrics
                        ? `${s.metrics.phasesCompleted}/${s.metrics.phasesTotal} phases`
                        : "Finished"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function FormatCard({ format: f, selected, onSelect }: { format: Format; selected: boolean; onSelect: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      className={cn(
        "text-left rounded-xl border p-4 space-y-2 transition-colors cursor-pointer",
        selected ? "border-green-500 bg-green-900/20" : "border-gray-800 bg-gray-900 hover:border-gray-600"
      )}
    >
      <p className="font-medium">{f.name}</p>
      <p className="text-sm text-gray-400">{f.oneLiner}</p>
      <div className="flex flex-wrap gap-2">
        {f.tags.map((t) => (
          <span key={t.label} className="inline-flex items-center gap-1.5 text-xs text-gray-300">
            {t.label} <SourceBadge source={t.source} />
          </span>
        ))}
      </div>
    </div>
  );
}

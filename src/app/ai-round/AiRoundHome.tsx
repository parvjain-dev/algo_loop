"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { CheckCircle2, ChevronRight, ExternalLink, Loader2, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import { FORMATS, HOW_COMPANIES_TEST, SOURCES, SOURCES_CHECKED, type Format } from "@/lib/ai-round/formats";
import type { Provider } from "@/lib/ai-round/types";
import type { Metrics } from "@/lib/ai-round/metrics";
import { cn } from "@/lib/utils";
import { GenerationProgress } from "./GenerationProgress";
import { useGeneration } from "./GenerationProvider";

export type KeySettings = { provider: Provider; model: string; key_hint: string; verified_at: string };
export type SessionRow = {
  id: string;
  title: string;
  format_id: string;
  status: string;
  created_at: string;
  metrics: Metrics | null;
  /** For unfinished sessions: minutes left on the clock (0 = time's up). */
  minutesLeft: number | null;
};

const PROVIDERS: { id: Provider; name: string; keyUrl: string; note: string }[] = [
  { id: "gemini", name: "Gemini", keyUrl: "https://aistudio.google.com/apikey", note: "Free tier" },
  { id: "openai", name: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", note: "Pay as you go" },
  { id: "anthropic", name: "Claude", keyUrl: "https://console.anthropic.com/settings/keys", note: "Pay as you go" },
];

export function SourceBadge({ source }: { source: string }) {
  const s = SOURCES[source];
  if (!s) return null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
      title={s.label}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
        s.kind === "official" ? "bg-green-900/60 text-green-300" : "bg-amber-500/10 text-amber-300"
      )}
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
  const [editingKey, setEditingKey] = useState(false);
  const [provider, setProvider] = useState<Provider>(initialSettings?.provider ?? "gemini");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState("");

  const generation = useGeneration();
  const { job, ready } = generation;
  const gen = job?.gen ?? null;

  const [pickedFormat, setFormatId] = useState(FORMATS[0].id);
  const [topic, setTopic] = useState("");
  const [startError, setStartError] = useState("");
  const [openingCurated, setOpeningCurated] = useState(false);
  const busy = openingCurated || job !== null;
  // While a problem is being built, show the format it's being built for.
  const formatId = job?.formatId ?? pickedFormat;

  const selected = FORMATS.find((f) => f.id === formatId)!;
  const needsKey = selected.aiAllowed && !settings;
  const error = startError || generation.error;

  useEffect(() => {
    if (!initialSettings) return;
    fetch("/api/ai-round/key", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((d) => {
        if (d.models) setModels(d.models);
        if (d.model) setSettings((s) => (s ? { ...s, model: d.model } : s));
      })
      .catch(() => {});
  }, [initialSettings]);

  // ---------- key ----------
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
    setEditingKey(false);
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
    setEditingKey(false);
  };

  // ---------- start ----------
  const startCurated = async () => {
    setOpeningCurated(true);
    setStartError("");
    generation.dismiss();
    try {
      const res = await fetch("/api/ai-round/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formatId, source: "curated" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the session");
      router.push(`/ai-round/${data.id}`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start");
      setOpeningCurated(false);
    }
  };

  const startGenerated = () => {
    setStartError("");
    generation.start({ formatId, topic, model: settings?.model ?? "" });
  };

  const providerInfo = PROVIDERS.find((p) => p.id === provider)!;
  const connectedName = PROVIDERS.find((p) => p.id === settings?.provider)?.name;

  const keyForm = (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="AI provider" className="inline-flex p-1 rounded-lg bg-gray-950 border border-gray-800">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={provider === p.id}
            onClick={() => setProvider(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              provider === p.id ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-100"
            )}
          >
            {p.name} <span className="text-xs text-gray-500">{p.note}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apiKey.trim().length >= 20 && void saveKey()}
          placeholder={`Paste your ${providerInfo.name} API key`}
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
        />
        <button
          onClick={saveKey}
          disabled={keyBusy || apiKey.trim().length < 20}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2"
        >
          {keyBusy && <Loader2 size={14} className="animate-spin" />} Verify and save
        </button>
      </div>
      {keyError && <p className="text-sm text-red-400">{keyError}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <a href={providerInfo.keyUrl} target="_blank" rel="noopener" className="text-green-400 hover:text-green-300">
          Get a {providerInfo.name} key
        </a>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={12} /> Checked with {providerInfo.name}, stored encrypted, never shown again
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">AI Round</h1>
          <p className="text-gray-400 mt-2 leading-relaxed">
            Practise the coding rounds where an AI assistant sits beside you: a real multi-file codebase, tests that unlock
            part by part, and a review that only says what your session shows.
          </p>
        </div>
        {settings && (
          <div className="flex items-center gap-2 rounded-full bg-gray-900 border border-gray-800 pl-3 pr-1 py-1 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden />
            <span className="text-gray-300">{connectedName}</span>
            <select
              aria-label="Model"
              value={settings.model}
              onChange={(e) => changeModel(e.target.value)}
              className="bg-transparent text-gray-100 font-mono text-xs focus:outline-none max-w-[190px]"
            >
              {[settings.model, ...models.filter((m) => m !== settings.model)].map((m) => (
                <option key={m} value={m} className="bg-gray-900">
                  {m}
                </option>
              ))}
            </select>
            <button
              onClick={() => setEditingKey((v) => !v)}
              className="text-xs text-gray-400 hover:text-gray-100 px-2.5 py-1 rounded-full hover:bg-gray-800"
            >
              {editingKey ? "Close" : "Change key"}
            </button>
          </div>
        )}
      </header>

      {setupMissing && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg p-3">
          AI Round tables aren&apos;t set up yet. Run <code className="font-mono">supabase-ai-round.sql</code> in the Supabase SQL
          editor.
        </div>
      )}

      {(!settings || editingKey) && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold">{settings ? "Change your AI key" : "Connect your AI"}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Your own key powers the chat, problem generation and the review. Gemini&apos;s free tier is enough to start.
            </p>
          </div>
          {keyForm}
          {settings && (
            <button onClick={removeKey} className="text-xs text-red-300 hover:text-red-200">
              Remove my key ({connectedName}
              {settings.key_hint ? ` ending ${settings.key_hint}` : ""})
            </button>
          )}
        </section>
      )}

      {/* Start */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="p-3 border-b lg:border-b-0 lg:border-r border-gray-800" role="radiogroup" aria-label="Format">
            {FORMATS.map((f) => (
              <FormatRow
                key={f.id}
                format={f}
                selected={f.id === formatId}
                disabled={busy}
                onSelect={() => setFormatId(f.id)}
              />
            ))}
          </div>

          <div className="p-6 lg:p-8 min-h-[420px]">
            {gen ? (
              <GenerationProgress gen={gen} model={job?.model ?? ""} onCancel={generation.cancel} />
            ) : ready ? (
              <div className="h-full flex flex-col items-start justify-center gap-4 ar-in">
                <CheckCircle2 size={28} className="text-green-400" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Your problem is ready</h2>
                  <p className="text-gray-400 mt-1.5">
                    {ready.title}. It was built while you were on another page. The clock starts when you open it.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/ai-round/${ready.id}`}
                    onClick={generation.dismiss}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                  >
                    <Play size={15} /> Open session
                  </Link>
                  <button
                    onClick={generation.dismiss}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                  >
                    <X size={14} /> Later
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
                <p className="text-gray-400 mt-1.5 leading-relaxed">{selected.oneLiner}</p>

                <ol className="mt-6 flex flex-wrap gap-2">
                  {selected.steps.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-gray-200">
                      <span className="w-6 h-6 rounded-full bg-gray-800 text-gray-300 text-xs grid place-items-center tabular">
                        {i + 1}
                      </span>
                      {s}
                      {i < selected.steps.length - 1 && <ChevronRight size={14} className="text-gray-600" />}
                    </li>
                  ))}
                </ol>

                <dl className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-950/60 border border-gray-800 px-3 py-2.5">
                    <dt className="text-gray-500 text-xs">Time</dt>
                    <dd className="text-gray-200 mt-0.5">{selected.minutes} minutes, then it ends on its own</dd>
                  </div>
                  <div className="rounded-lg bg-gray-950/60 border border-gray-800 px-3 py-2.5">
                    <dt className="text-gray-500 text-xs">AI</dt>
                    <dd className="text-gray-200 mt-0.5">
                      {selected.aiAllowed ? "Chat that reads your files but can't edit them" : "Off for the whole session"}
                    </dd>
                  </div>
                </dl>
                {selected.clarifyStep && (
                  <p className="text-sm text-gray-400 mt-3">
                    The AI stays locked until you write your clarifying questions and assumptions.
                  </p>
                )}

                <div className="mt-auto pt-8 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={busy}
                      placeholder="Any domain, or name one: ride-sharing, ticketing…"
                      className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button
                      disabled={busy || !settings}
                      onClick={startGenerated}
                      title={settings ? "" : "Connect your AI first"}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-40"
                    >
                      <Sparkles size={15} /> Generate a new problem
                    </button>
                  </div>
                  {selected.curated && (
                    <button
                      disabled={busy || needsKey}
                      onClick={startCurated}
                      title={needsKey ? "Connect your AI first" : ""}
                      className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white disabled:opacity-40"
                    >
                      {openingCurated ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      Or practise with Log Analyzer, a ready-made problem that opens instantly
                    </button>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {!settings && (
                    <p className="text-xs text-gray-500">
                      Without a key, you can still practise Log Analyzer in Solo. Everything else needs your AI.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* History */}
      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Your sessions</h2>
          <ul className="rounded-xl border border-gray-800 divide-y divide-gray-800 overflow-hidden">
            {sessions.map((s) => {
              const f = FORMATS.find((x) => x.id === s.format_id);
              const m = s.metrics;
              const pct = m ? Math.round((m.phasesCompleted / Math.max(1, m.phasesTotal)) * 100) : 0;
              return (
                <li key={s.id}>
                  <Link href={`/ai-round/${s.id}`} className="flex items-center gap-4 px-4 py-3 bg-gray-900 hover:bg-gray-800/60">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {f?.name}, {formatDate(new Date(s.created_at), "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    {s.status === "active" ? (
                      s.minutesLeft ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-900/60 text-green-300 tabular">
                          In progress, {s.minutesLeft} min left
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                          Time&apos;s up, open it for your review
                        </span>
                      )
                    ) : m ? (
                      <div className="w-36 text-right">
                        <p className="text-xs text-gray-400 tabular">
                          {m.phasesCompleted} of {m.phasesTotal} parts
                        </p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Finished</span>
                    )}
                    <ChevronRight size={16} className="text-gray-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* How companies test */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">How companies run these rounds</h2>
          <span className="text-xs text-gray-500">
            Sources checked {formatDate(new Date(SOURCES_CHECKED), "d MMM yyyy")}. Formats change, so confirm with your
            recruiter.
          </span>
        </div>
        <ul className="divide-y divide-gray-800 border-y border-gray-800">
          {HOW_COMPANIES_TEST.map((h, i) => (
            <li key={i} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 py-3 text-sm">
              <span className="sm:w-24 shrink-0 font-medium text-gray-200">{h.company}</span>
              <span className="flex-1 text-gray-400 leading-relaxed">{h.line}</span>
              <SourceBadge source={h.source} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FormatRow({
  format: f,
  selected,
  disabled,
  onSelect,
}: {
  format: Format;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative rounded-lg px-4 py-3.5 cursor-pointer transition-colors",
        selected ? "bg-gray-800" : "hover:bg-gray-800/50",
        disabled && !selected && "opacity-50 cursor-not-allowed"
      )}
    >
      {selected && <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-green-400" aria-hidden />}
      <div className="flex items-center gap-2">
        <p className={cn("font-medium", selected ? "text-white" : "text-gray-200")}>{f.name}</p>
        {selected && <CheckCircle2 size={14} className="text-green-400" />}
      </div>
      <p className="text-sm text-gray-400 mt-0.5 leading-snug">{f.oneLiner}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {f.tags.map((t) => (
          <span key={t.label} className="inline-flex items-center gap-1.5">
            {t.label} <SourceBadge source={t.source} />
          </span>
        ))}
      </div>
    </div>
  );
}

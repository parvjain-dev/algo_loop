"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info, Lightbulb, Loader2, RotateCcw, Sparkles, ThumbsUp } from "lucide-react";
import type { Format } from "@/lib/ai-round/formats";
import type { Metrics } from "@/lib/ai-round/metrics";
import type { Review } from "@/lib/ai-round/review";
import type { Files, ProblemBundle } from "@/lib/ai-round/types";
import { cn } from "@/lib/utils";
import { SourceBadge } from "../AiRoundHome";
import { SIGNALS } from "@/lib/ai-round/formats";

type SavedReview = Review | { headline: string; error: string | null } | null;

function Evidence({ ids, eventText }: { ids: number[]; eventText: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  if (!ids.length) return null;
  return (
    <div className="mt-1">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-sky-300 hover:text-sky-200">
        {open ? "Hide" : "Show"} {ids.length === 1 ? "the moment" : `${ids.length} moments`} from your session
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {ids.map((id) => (
            <li key={id} className="text-xs font-mono text-gray-400 bg-gray-950 border border-gray-800 rounded px-2 py-1 whitespace-pre-wrap">
              {eventText[id] ?? `E${id}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

export function ReviewView({
  sessionId,
  title,
  format,
  problem,
  finalFiles,
  solution,
  metrics,
  review,
  eventText,
}: {
  sessionId: string;
  title: string;
  format: Format;
  problem: ProblemBundle;
  finalFiles: Files;
  solution: Files | null;
  metrics: Metrics | null;
  review: SavedReview;
  eventText: Record<string, string>;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const full = review && "strengths" in review ? review : null;
  const error = review && "error" in review ? review.error : !review ? "The review hasn't been generated yet." : null;

  const retry = async () => {
    setRetrying(true);
    await fetch(`/api/ai-round/sessions/${sessionId}/finish`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    router.refresh();
    setRetrying(false);
  };

  const changed = Object.keys({ ...finalFiles, ...(solution || {}) })
    .filter((p) => p.endsWith(".py") && !p.startsWith("tests/") && p !== "conftest.py")
    .filter((p) => finalFiles[p] !== problem.files[p] || (solution && solution[p] !== undefined))
    .sort();
  const [file, setFile] = useState(changed[0] ?? "");
  const [view, setView] = useState<"yours" | "reference">("yours");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-2">
        <Link href="/ai-round" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          <ArrowLeft size={14} /> AI Round
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-400">{format.name} · review</p>
        {review?.headline && <p className="text-lg text-gray-100">{review.headline}</p>}
      </div>

      {metrics && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Phases complete" value={`${metrics.phasesCompleted}/${metrics.phasesTotal}`} />
          <Stat label="Minutes" value={String(Math.round(metrics.minutes))} />
          <Stat label="Test runs" value={String(metrics.testRuns)} />
          {format.aiAllowed && <Stat label="AI prompts" value={String(metrics.aiPrompts)} />}
          {format.aiAllowed && (
            <Stat
              label="AI code tested before next prompt"
              value={metrics.aiCodePastes ? `${metrics.aiPastesTested}/${metrics.aiCodePastes}` : "No pastes"}
            />
          )}
          {format.aiAllowed && format.thinkFirst && <Stat label="Think-first answers" value={String(metrics.thinkFirstAnswered)} />}
        </section>
      )}

      {metrics?.flags.map((f) => (
        <section key={f.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-200 font-medium">{f.label}</p>
          <p className="text-xs text-amber-100/70 mt-1">
            Canva names this pattern &quot;Hands-Off&quot;: strong candidates review and test what the AI writes.
          </p>
          <Evidence ids={f.evidence} eventText={eventText} />
        </section>
      ))}

      {error && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
          <Info size={16} className="text-gray-400 shrink-0" />
          <p className="text-sm text-gray-300 flex-1">{error}</p>
          <button
            onClick={retry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm disabled:opacity-50"
          >
            {retrying ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Try again
          </button>
        </section>
      )}

      {full && (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <ThumbsUp size={18} className="text-emerald-400" /> What went well
            </h2>
            {full.strengths.length === 0 ? (
              <p className="text-sm text-gray-400">The log didn&apos;t show enough to point at specific moments this time.</p>
            ) : (
              <ul className="space-y-3">
                {full.strengths.map((s, i) => (
                  <li key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="text-sm">{s.text}</p>
                    {s.quote && <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{s.quote}&rdquo;</p>}
                    {s.signal && (
                      <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-2">
                        Interviewers look for this: {s.signalLabel} <SourceBadge source={SIGNALS[s.signal].source} />
                      </p>
                    )}
                    <Evidence ids={s.evidence} eventText={eventText} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {format.aiAllowed && full.aiUsage && (
            <section className="space-y-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles size={18} className="text-sky-400" /> How you used the AI
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <p className="text-sm">{full.aiUsage.summary}</p>
                <Evidence ids={full.aiUsage.evidence} eventText={eventText} />
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-300" /> {format.aiAllowed ? "How to use it even better" : "Next time"}
            </h2>
            {full.strong ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex gap-2">
                <CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-100">
                  {`Nothing to change. You finished every phase${format.aiAllowed ? " and checked the AI's work before moving on" : ""}. That's how strong candidates work: keep doing exactly this.`}
                </p>
              </div>
            ) : full.improvements.length === 0 ? (
              <p className="text-sm text-gray-400">No specific moment in your log called for a different move.</p>
            ) : (
              <ul className="space-y-3">
                {full.improvements.map((s, i) => (
                  <li key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-gray-300">{s.text}</p>
                    <p className="text-sm">
                      <span className="text-amber-300 font-medium">Next time: </span>
                      {s.better}
                    </p>
                    <Evidence ids={s.evidence} eventText={eventText} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Scores</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {full.dimensions.map((d) => (
                <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{d.label}</p>
                    {d.score ? (
                      <span className="flex gap-1" aria-label={`${d.score} out of 4`}>
                        {[1, 2, 3, 4].map((n) => (
                          <span key={n} className={cn("w-2.5 h-2.5 rounded-full", n <= d.score! ? "bg-emerald-400" : "bg-gray-700")} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Not rated</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{d.reason}</p>
                  <Evidence ids={d.evidence} eventText={eventText} />
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-gray-500">
            Every point links to moments from your session. Numbers are counted by Algo Loop, not the AI.
            {full.droppedClaims > 0 &&
              ` ${full.droppedClaims} point${full.droppedClaims === 1 ? "" : "s"} the AI couldn't back with evidence ${full.droppedClaims === 1 ? "was" : "were"} removed.`}{" "}
            Reviewed by {full.model}.
          </p>
        </>
      )}

      {changed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Code</h2>
          <div className="flex flex-wrap gap-2">
            {changed.map((p) => (
              <button
                key={p}
                onClick={() => setFile(p)}
                className={cn("text-xs font-mono px-2 py-1 rounded border", p === file ? "border-sky-500 text-sky-200" : "border-gray-700 text-gray-400")}
              >
                {p}
              </button>
            ))}
            {solution && (
              <div className="ml-auto flex gap-1 text-xs">
                {(["yours", "reference"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn("px-2 py-1 rounded", view === v ? "bg-gray-800 text-white" : "text-gray-400")}
                  >
                    {v === "yours" ? "Your code" : "One reference solution"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs overflow-x-auto max-h-[480px]">
            {(view === "reference" ? solution?.[file] ?? problem.files[file] : finalFiles[file]) ?? "(file not present)"}
          </pre>
          {view === "reference" && (
            <p className="text-xs text-gray-500">The reference is one valid answer, not the only one.</p>
          )}
        </section>
      )}

      <Link
        href="/ai-round"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium"
      >
        <RotateCcw size={14} /> Practice again
      </Link>
    </div>
  );
}

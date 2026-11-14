"use client";

import { useEffect, useState } from "react";
import { Check, FileCode2, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckRow = { label: string; status: "pending" | "active" | "done" | "failed"; detail?: string };

export type GenState = {
  startedAt: number;
  stage: "writing" | "checking" | "opening";
  /** Writing a new problem, or fixing the one that failed the check. */
  mode: "write" | "repair";
  pythonMs: number | null;
  attempt: number;
  maxAttempts: number;
  /** Why earlier attempts were thrown away, oldest first. */
  notes: string[];
  /** Files from the AI's latest problem (null while it is still writing). */
  files: { path: string; lines: number }[] | null;
  checks: CheckRow[];
};

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function StepIcon({ status }: { status: CheckRow["status"] }) {
  if (status === "done")
    return (
      <span className="w-5 h-5 rounded-full bg-green-900 text-green-300 grid place-items-center shrink-0">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  if (status === "failed")
    return (
      <span className="w-5 h-5 rounded-full bg-red-950 text-red-300 grid place-items-center shrink-0">
        <X size={12} strokeWidth={3} />
      </span>
    );
  if (status === "active") return <Loader2 size={20} className="text-green-400 animate-spin shrink-0" />;
  return <span className="block w-5 h-5 rounded-full border border-gray-700 shrink-0" />;
}

function Step({
  status,
  title,
  aside,
  children,
}: {
  status: CheckRow["status"];
  title: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-0.5">
        <StepIcon status={status} />
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("text-sm", status === "pending" ? "text-gray-500" : "text-gray-100", status === "active" && "font-medium")}>
          {title}
        </p>
        {aside && <span className="text-xs text-gray-500 tabular shrink-0">{aside}</span>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </li>
  );
}

/** Placeholder code lines while the AI is writing: widths are fixed so it doesn't jitter. */
const LINE_WIDTHS = [62, 38, 0, 74, 55, 81, 47, 0, 69, 33, 58];

export function GenerationProgress({
  gen,
  model,
  onCancel,
}: {
  gen: GenState;
  model: string;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const writing = gen.stage === "writing";
  const checksDone = gen.stage === "opening";
  const totalLines = gen.files?.reduce((n, f) => n + f.lines, 0) ?? 0;

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Building your problem</p>
          <p className="text-xs text-gray-500 mt-0.5">
            With <span className="text-gray-300">{model}</span>. This usually takes 1–3 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular text-gray-300">{clock(now - gen.startedAt)}</span>
          {gen.stage !== "opening" && (
            <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-100 px-2 py-1 rounded-md hover:bg-gray-800">
              Cancel
            </button>
          )}
        </div>
      </div>

      <ol className="space-y-4">
        <Step
          status={gen.pythonMs === null ? "active" : "done"}
          title={gen.pythonMs === null ? "Loading Python in your browser" : "Python ready in your browser"}
          aside={gen.pythonMs !== null ? `${(gen.pythonMs / 1000).toFixed(1)}s` : undefined}
        />

        <Step
          status={writing ? "active" : "done"}
          title={
            writing
              ? gen.mode === "repair"
                ? "Your AI is fixing what failed the check"
                : "Your AI is writing the codebase, tests and a hidden solution"
              : gen.mode === "repair"
                ? "Problem fixed"
                : "Problem written"
          }
          aside={gen.attempt > 1 ? `Attempt ${gen.attempt} of ${gen.maxAttempts}` : undefined}
        >
          <div className="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
            {writing || !gen.files ? (
              <div className="p-4 space-y-2.5" aria-hidden>
                {LINE_WIDTHS.map((w, i) =>
                  w === 0 ? (
                    <div key={i} className="h-2" />
                  ) : (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-4 text-right text-[10px] text-gray-600 font-mono tabular">{i + 1}</span>
                      <div className="h-2 rounded ar-shimmer" style={{ width: `${w}%` }} />
                      {i === LINE_WIDTHS.length - 1 && <span className="w-1.5 h-3.5 bg-green-400 ar-caret" />}
                    </div>
                  )
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-800/70">
                {gen.files.map((f, i) => (
                  <li
                    key={f.path}
                    className="ar-in flex items-center gap-3 px-4 py-2 text-sm"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    {f.path.endsWith(".md") ? (
                      <FileText size={14} className="text-gray-500" />
                    ) : (
                      <FileCode2 size={14} className={f.path.startsWith("tests/") ? "text-amber-400/80" : "text-green-400"} />
                    )}
                    <span className="font-mono text-[13px] text-gray-200 truncate">{f.path}</span>
                    <span className="ml-auto text-xs text-gray-500 tabular">{f.lines} lines</span>
                  </li>
                ))}
                <li className="px-4 py-2 text-xs text-gray-500 tabular">
                  {gen.files.length} files, {totalLines} lines
                </li>
              </ul>
            )}
          </div>
          {gen.notes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {gen.notes.map((n, i) => (
                <li key={i} className="text-xs text-amber-300/90">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </Step>

        <Step
          status={gen.stage === "checking" ? "active" : checksDone ? "done" : "pending"}
          title="Checking it really works"
        >
          {gen.checks.length > 0 && (
            <ul className="space-y-2">
              {gen.checks.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-px">
                    {c.status === "done" ? (
                      <Check size={14} className="text-green-400" strokeWidth={3} />
                    ) : c.status === "failed" ? (
                      <X size={14} className="text-red-400" strokeWidth={3} />
                    ) : c.status === "active" ? (
                      <Loader2 size={14} className="text-green-400 animate-spin" />
                    ) : (
                      <span className="block w-3.5 h-3.5 rounded-full border border-gray-700" />
                    )}
                  </span>
                  <span className={cn(c.status === "pending" ? "text-gray-500" : "text-gray-300")}>
                    {c.label}
                    {c.detail && <span className="text-gray-500"> ({c.detail})</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Step>

        <Step status={checksDone ? "active" : "pending"} title="Opening your session" />
      </ol>
    </div>
  );
}

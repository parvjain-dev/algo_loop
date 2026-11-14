"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { PythonRunner } from "@/lib/ai-round/runner";
import { validateByRunning, type CheckProgress } from "@/lib/ai-round/validate";
import type { GeneratedProblem } from "@/lib/ai-round/types";
import type { CheckRow, GenState } from "./GenerationProgress";

/**
 * Problem generation lives here, above every page, so it keeps running while
 * the student uses the rest of Algo Loop. A small card in the corner shows
 * progress anywhere except the AI Round page, which shows the full panel.
 * Only closing or reloading the tab stops it.
 */

/** One fresh problem plus up to three targeted fixes. */
export const MAX_ATTEMPTS = 4;
const HOME = "/ai-round";

export type GenerationJob = {
  formatId: string;
  model: string;
  gen: GenState;
};

type Ctx = {
  /** The build in progress, if any. */
  job: GenerationJob | null;
  /** Finished while you were on another page: waiting to be opened. */
  ready: { id: string; title: string } | null;
  /** Why the last build stopped. */
  error: string;
  start: (o: { formatId: string; topic: string; model: string }) => void;
  cancel: () => void;
  dismiss: () => void;
};

const GenerationContext = createContext<Ctx | null>(null);

export function useGeneration(): Ctx {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used inside GenerationProvider");
  return ctx;
}

const lineCount = (s: string) => s.split("\n").length;

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const [job, setJob] = useState<GenerationJob | null>(null);
  const [ready, setReady] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const runnerRef = useRef<PythonRunner | null>(null);

  // Closing or reloading the tab is the one thing that stops a build: ask first.
  const building = job !== null && job.gen.stage !== "opening";
  useEffect(() => {
    if (!building) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [building]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      runnerRef.current?.dispose();
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setJob(null);
  }, []);

  const dismiss = useCallback(() => {
    setReady(null);
    setError("");
  }, []);

  const start = useCallback(
    ({ formatId, topic, model }: { formatId: string; topic: string; model: string }) => {
      if (abortRef.current) return; // one build at a time
      const controller = new AbortController();
      abortRef.current = controller;
      setError("");
      setReady(null);

      runnerRef.current ??= new PythonRunner();
      const runner = runnerRef.current;

      const t0 = Date.now();
      const update = (fn: (g: GenState) => GenState) =>
        setJob((j) => (j && !controller.signal.aborted ? { ...j, gen: fn(j.gen) } : j));
      const note = (text: string) => update((g) => ({ ...g, notes: [...g.notes, text] }));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const finish = () => {
        if (abortRef.current === controller) abortRef.current = null;
      };

      setJob({
        formatId,
        model,
        gen: {
          startedAt: t0,
          stage: "writing",
          mode: "write",
          pythonMs: null,
          attempt: 1,
          maxAttempts: MAX_ATTEMPTS,
          notes: [],
          files: null,
          checks: [],
        },
      });

      const r = runner;
      const run = async () => {
        const warm = r.ready().then(() => update((g) => ({ ...g, pythonMs: Date.now() - t0 })));
        warm.catch(() => {}); // a load failure surfaces when the check runs

        // After a failed check we keep the problem and ask the AI to fix only
        // what failed (fast). A fresh problem is only written if a fix fails.
        let feedback = "";
        let toRepair: { problem: GeneratedProblem; reason: string } | null = null;
        let busyRetried = false;
        let slowRetried = false;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const repairing = Boolean(toRepair);
          update((g) => ({
            ...g,
            stage: "writing",
            mode: repairing ? "repair" : "write",
            attempt,
            checks: repairing ? g.checks : [],
            files: repairing ? g.files : null,
          }));
          const res = await fetch("/api/ai-round/generate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(toRepair ? { formatId, repair: toRepair } : { formatId, topic, feedback }),
            signal: controller.signal,
          });
          const data = await res.json().catch(() => ({}));

          if (res.status === 503 && !busyRetried) {
            // Provider overloaded even after the server's retries: one more try after a pause.
            busyRetried = true;
            note("Your AI provider is overloaded right now. Trying again in 20 seconds…");
            await wait(20_000);
            if (controller.signal.aborted) return;
            attempt--;
            continue;
          }
          if (res.status === 504 && attempt < MAX_ATTEMPTS && !slowRetried) {
            // The AI took too long to answer. Nothing was saved (a problem is only
            // saved once it passes the check), so just try again: a fix that timed
            // out is replaced by a fresh problem, which is usually quicker to get right.
            slowRetried = true;
            note(
              repairing
                ? `Attempt ${attempt}: your AI took too long to fix it, so it's writing a fresh problem instead.`
                : `Attempt ${attempt}: your AI took too long to answer, so it's trying again.`
            );
            toRepair = null;
            continue;
          }
          if (res.status === 422 && data.retry) {
            note(
              data.repairFailed
                ? `Attempt ${attempt}: the fix wasn't usable, so it's writing a fresh problem instead.`
                : `Attempt ${attempt}: the AI's output wasn't usable, so it's writing a new one.`
            );
            feedback = data.retry;
            if (data.repairFailed) toRepair = null;
            continue;
          }
          if (!res.ok) throw new Error(data.error || "Generation failed");

          const problem = data.problem as GeneratedProblem;
          const files = Object.entries({ ...problem.files, ...problem.tests })
            .filter(([p]) => p !== "conftest.py" && !p.endsWith("__init__.py"))
            .map(([path, content]) => ({ path, lines: lineCount(content) }))
            .sort(
              (a, b) =>
                Number(a.path.startsWith("tests/")) - Number(b.path.startsWith("tests/")) || a.path.localeCompare(b.path)
            );
          const checks: CheckRow[] = [
            ...problem.phases.map((_, i) => ({ label: `Part ${i + 1} tests fail on the starter code`, status: "pending" as const })),
            { label: "The hidden solution passes every test", status: "pending" as const },
          ];
          update((g) => ({ ...g, stage: "checking", files, checks }));
          await r.ready();
          if (controller.signal.aborted) return;

          const setCheck = (i: number, row: Partial<CheckRow>) =>
            update((g) => ({ ...g, checks: g.checks.map((c, j) => (j === i ? { ...c, ...row } : c)) }));
          const last = problem.phases.length;
          let activeIndex = 0;
          const onProgress = (p: CheckProgress) => {
            if (p.kind === "phase-start") setCheck((activeIndex = p.index), { status: "active" });
            if (p.kind === "phase-done") setCheck(p.index, { status: "done", detail: `${p.failing} of ${p.total} fail` });
            if (p.kind === "solution-start") setCheck((activeIndex = last), { status: "active" });
            if (p.kind === "solution-done") setCheck(last, { status: "done", detail: `${p.passed} of ${p.total} pass` });
          };
          const reason = await validateByRunning(problem, (f, t) => r.run(f, t), onProgress);
          if (controller.signal.aborted) return;
          if (!reason) {
            update((g) => ({ ...g, stage: "opening" }));
            const created = await fetch("/api/ai-round/sessions", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ formatId, source: "generated", problem }),
              signal: controller.signal,
            });
            const out = await created.json().catch(() => ({}));
            if (!created.ok) throw new Error(out.error || "Couldn't start the session");
            finish();
            setJob(null);
            if (pathRef.current === HOME) router.push(`${HOME}/${out.id}`);
            else {
              // They're elsewhere in the app: don't yank them away, just say it's ready.
              setReady({ id: out.id, title: problem.title });
              router.refresh();
            }
            return;
          }
          setCheck(activeIndex, { status: "failed" });
          toRepair = { problem, reason };
          note(
            `Attempt ${attempt} didn't pass the check: ${reason.split("\n")[0].replace(/[.:]\s*$/, "")}. Asking the AI to fix just that.`
          );
        }
        throw new Error(
          `The AI's problems didn't pass the check after ${MAX_ATTEMPTS} tries. Try again, pick another model, or practise with Log Analyzer.`
        );
      };

      run().catch((err) => {
        if (controller.signal.aborted) return;
        finish();
        setJob(null);
        setError(err instanceof Error ? err.message : "Couldn't build the problem");
      });
    },
    [router]
  );

  const value = useMemo(() => ({ job, ready, error, start, cancel, dismiss }), [job, ready, error, start, cancel, dismiss]);

  return (
    <GenerationContext.Provider value={value}>
      {children}
      {pathname !== HOME && <GenerationDock />}
    </GenerationContext.Provider>
  );
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The corner card shown on every other page while a problem is built, or once it's ready. */
function GenerationDock() {
  const { job, ready, error, cancel, dismiss } = useGeneration();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!job) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job]);

  if (!job && !ready && !error) return null;

  let body: React.ReactNode;
  if (job) {
    const g = job.gen;
    const done = g.checks.filter((c) => c.status === "done").length;
    const step =
      g.stage === "writing"
        ? g.mode === "repair"
          ? "Your AI is fixing what failed the check"
          : "Your AI is writing the problem"
        : g.stage === "checking"
          ? `Checking it really works (${done} of ${g.checks.length})`
          : "Opening your session";
    body = (
      <>
        <div className="flex items-start gap-3">
          <Loader2 size={18} className="text-green-400 animate-spin shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-100">Building your problem</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {step}
              {g.attempt > 1 ? `, attempt ${g.attempt} of ${g.maxAttempts}` : ""}
            </p>
          </div>
          <span className="text-xs text-gray-400 tabular">{clock(now - g.startedAt)}</span>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1">
          <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-100 px-2.5 py-1.5 rounded-md hover:bg-gray-800">
            Cancel
          </button>
          <Link href={HOME} className="text-xs font-medium text-green-300 hover:text-green-200 px-2.5 py-1.5 rounded-md hover:bg-gray-800">
            View progress
          </Link>
        </div>
      </>
    );
  } else if (ready) {
    body = (
      <>
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-100">Your problem is ready</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{ready.title}. The clock starts when you open it.</p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="text-gray-500 hover:text-gray-200 -mt-0.5">
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <Link
            href={`${HOME}/${ready.id}`}
            onClick={dismiss}
            className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md"
          >
            Open session
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-100">Your problem couldn&apos;t be built</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{error}</p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="text-gray-500 hover:text-gray-200 -mt-0.5">
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <Link href={HOME} className="text-xs font-medium text-green-300 hover:text-green-200 px-2.5 py-1.5 rounded-md hover:bg-gray-800">
            Back to AI Round
          </Link>
        </div>
      </>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] rounded-xl border border-gray-700 bg-gray-900/95 backdrop-blur shadow-2xl shadow-black/40 p-4 ar-in"
    >
      {body}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  FileCode2,
  FileText,
  Flag,
  Loader2,
  Lock,
  Play,
  Send,
  Timer,
} from "lucide-react";
import { getFormat } from "@/lib/ai-round/formats";
import { pasteFromAi } from "@/lib/ai-round/metrics";
import { PythonRunner } from "@/lib/ai-round/runner";
import { testsThrough } from "@/lib/ai-round/validate";
import type { EventType, Files, ProblemBundle, RunResult, SessionEvent } from "@/lib/ai-round/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";

export type SessionData = {
  id: string;
  format_id: string;
  title: string;
  problem: ProblemBundle;
  files: Files;
  phase: number;
  status: string;
  started_at: string;
  duration_seconds: number;
};

type ChatMsg = { role: "user" | "assistant"; content: string; seq: number };

const FLUSH_MS = 4000;

/** Rough count of changed lines between two snapshots (multiset difference per file). */
function linesChanged(a: Files, b: Files): number {
  let n = 0;
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (path.startsWith("tests/") || a[path] === b[path]) continue;
    const left = new Map<string, number>();
    for (const l of (a[path] ?? "").split("\n")) left.set(l, (left.get(l) || 0) + 1);
    let added = 0;
    for (const l of (b[path] ?? "").split("\n")) {
      const c = left.get(l) || 0;
      if (c > 0) left.set(l, c - 1);
      else added++;
    }
    const removed = [...left.values()].reduce((s, c) => s + c, 0);
    n += Math.max(added, removed);
  }
  return n;
}

const isReadOnly = (path: string) => path.startsWith("tests/") || path === "conftest.py";
const shortTestName = (id: string) => id.split("::").slice(1).join("::") || id;

export function Workspace({ session, events, hasKey }: { session: SessionData; events: SessionEvent[]; hasKey: boolean }) {
  const router = useRouter();
  const format = getFormat(session.format_id);
  const problem = session.problem;
  const totalPhases = problem.phases.length;
  const startMs = useMemo(() => Date.parse(session.started_at), [session.started_at]);
  const deadline = startMs + session.duration_seconds * 1000;

  // ---------- restore from the event log ----------
  const restored = useMemo(() => {
    const completed = new Set(events.filter((e) => e.type === "phase_complete").map((e) => Number(e.data.phase)));
    const thinkFirst = new Set(events.filter((e) => e.type === "think_first").map((e) => Number(e.data.phase)));
    const chat: ChatMsg[] = events
      .filter((e) => e.type === "ai_user" || e.type === "ai_reply")
      .map((e) => ({ role: e.type === "ai_user" ? "user" : "assistant", content: String(e.data.text ?? ""), seq: e.seq }));
    return {
      completed,
      thinkFirst,
      chat,
      clarified: events.some((e) => e.type === "clarify"),
      closingDone: events.filter((e) => e.type === "closing").length,
      nextSeq: events.length ? Math.max(...events.map((e) => e.seq)) + 1 : 0,
    };
  }, [events]);

  const [phase, setPhase] = useState(Math.min(Math.max(session.phase, 1), totalPhases));
  const [completed, setCompleted] = useState<Set<number>>(restored.completed);
  const [files, setFiles] = useState<Files>(() => ({
    ...session.files,
    ...testsThrough(problem, Math.min(Math.max(session.phase, 1), totalPhases)),
  }));
  const [active, setActive] = useState<string>(
    () => Object.keys(session.files).find((p) => p.endsWith(".py") && !isReadOnly(p) && !p.endsWith("__init__.py")) ?? "conftest.py"
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runnerState, setRunnerState] = useState<"loading" | "ready" | "error">("loading");
  const [chat, setChat] = useState<ChatMsg[]>(restored.chat);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [thinkFirst, setThinkFirst] = useState<Set<number>>(restored.thinkFirst);
  const [clarified, setClarified] = useState(restored.clarified);
  const [gateText, setGateText] = useState("");
  const [closingIndex, setClosingIndex] = useState(restored.closingDone);
  const [closingText, setClosingText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [showBrief, setShowBrief] = useState(true);
  const [openTests, setOpenTests] = useState<Set<string>>(new Set());

  const runner = useRef<PythonRunner | null>(null);
  const seq = useRef(restored.nextSeq);
  const queue = useRef<SessionEvent[]>([]);
  const filesRef = useRef(files);
  const phaseRef = useRef(phase);
  const chatRef = useRef(chat);
  const lastRunFiles = useRef<Files>(session.files);
  const activeRef = useRef(active);
  const dirty = useRef(false);
  useEffect(() => {
    filesRef.current = files;
    phaseRef.current = phase;
    chatRef.current = chat;
    activeRef.current = active;
  }, [files, phase, chat, active]);

  // ---------- event log ----------
  const flush = useCallback(async () => {
    const batch = queue.current;
    if (!batch.length && !dirty.current) return;
    queue.current = [];
    dirty.current = false;
    try {
      const res = await fetch(`/api/ai-round/sessions/${session.id}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch, files: filesRef.current, phase: phaseRef.current }),
      });
      if (!res.ok && res.status !== 409) throw new Error(String(res.status));
    } catch {
      queue.current = [...batch, ...queue.current]; // retry next time; the server ignores duplicate seqs
      dirty.current = true;
    }
  }, [session.id]);

  const log = useCallback((type: EventType, data: Record<string, unknown> = {}) => {
    const e: SessionEvent = { seq: seq.current++, type, t_ms: Date.now() - startMs, data };
    queue.current.push(e);
    return e.seq;
  }, [startMs]);

  useEffect(() => {
    if (restored.nextSeq === 0) {
      log("session_start", { format: format.id });
      log("phase_start", { phase: 1, title: problem.phases[0].title });
      void flush();
    }
    const t = setInterval(() => void flush(), FLUSH_MS);
    const beforeUnload = () => {
      if (queue.current.length || dirty.current) {
        navigator.sendBeacon(
          `/api/ai-round/sessions/${session.id}/events`,
          new Blob([JSON.stringify({ events: queue.current, files: filesRef.current, phase: phaseRef.current })], {
            type: "application/json",
          })
        );
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", beforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Python runner ----------
  useEffect(() => {
    const r = new PythonRunner();
    runner.current = r;
    let alive = true;
    r.ready().then(
      () => alive && setRunnerState("ready"),
      () => alive && setRunnerState("error")
    );
    return () => {
      alive = false;
      r.dispose();
    };
  }, []);

  // ---------- timer ----------
  const remaining = Math.max(0, deadline - now);

  const allDone = completed.size >= totalPhases;
  const closingQuestions = format.closingQuestions;
  const closingPending = allDone && closingIndex < closingQuestions.length;

  const finishingRef = useRef(false);
  const finish = useCallback(
    async (reason: "submitted" | "timeout") => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setFinishing(true);
      log("session_end", { reason, linesChanged: linesChanged(problem.files, filesRef.current) });
      await flush();
      await fetch(`/api/ai-round/sessions/${session.id}/finish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ files: filesRef.current }),
      });
      router.refresh();
    },
    [flush, log, problem.files, router, session.id]
  );

  // Clock tick; when time is up the session ends on its own, like the real round.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) void finishRef.current("timeout");
    }, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  // ---------- tests ----------
  const runTests = async () => {
    if (!runner.current || running) return;
    setRunning(true);
    const current = filesRef.current;
    const canonical = { ...current, ...testsThrough(problem, phase) };
    const targets = problem.phases.slice(0, phase).map((p) => p.testPath);
    const r = await runner.current.run(canonical, targets);
    setRunning(false);
    setResult(r);
    log("test_run", {
      phase,
      passed: r.passed,
      total: r.total,
      failing: r.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").slice(0, 8).map((t) => shortTestName(t.id)),
      timedOut: Boolean(r.timedOut),
      linesChanged: linesChanged(lastRunFiles.current, current),
    });
    lastRunFiles.current = current;

    if (r.ok && !completed.has(phase)) {
      const done = new Set(completed).add(phase);
      setCompleted(done);
      log("phase_complete", { phase });
      if (phase < totalPhases) {
        const next = phase + 1;
        const nextPath = problem.phases[next - 1].testPath;
        setFiles((f) => ({ ...f, [nextPath]: problem.tests[nextPath] }));
        setPhase(next);
        phaseRef.current = next;
        setShowBrief(true);
        log("phase_start", { phase: next, title: problem.phases[next - 1].title });
      }
    }
    dirty.current = true;
    void flush();
  };

  // ---------- editor ----------
  const onMount: OnMount = (editor) => {
    editor.onDidPaste((e) => {
      const model = editor.getModel();
      if (!model) return;
      const text = model.getValueInRange(e.range);
      if (text.replace(/\s+/g, "").length < 40) return;
      const replies = chatRef.current.filter((m) => m.role === "assistant");
      const match = [...replies].reverse().find((m) => pasteFromAi(text, [m.content]));
      log("paste", {
        file: activeRef.current,
        lines: text.split("\n").length,
        fromAi: Boolean(match),
        replySeq: match?.seq ?? null,
      });
    });
  };

  // ---------- chat ----------
  const needsClarify = format.aiAllowed && format.clarifyStep && !clarified;
  const needsThinkFirst = format.aiAllowed && Boolean(format.thinkFirst) && !thinkFirst.has(phase) && !allDone;
  const chatLocked = needsClarify || needsThinkFirst;

  const submitGate = () => {
    const text = gateText.trim();
    if (needsClarify) {
      log("clarify", { text });
      setClarified(true);
    } else {
      log("think_first", { phase, question: format.thinkFirst, answer: text });
      setThinkFirst((s) => new Set(s).add(phase));
    }
    setGateText("");
    void flush();
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || thinking || chatLocked) return;
    setDraft("");
    setChatError("");
    const userSeq = log("ai_user", { text });
    const history = [...chatRef.current, { role: "user" as const, content: text, seq: userSeq }];
    setChat(history);
    setThinking(true);
    const visible = filesRef.current;
    try {
      const res = await fetch(`/api/ai-round/sessions/${session.id}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: history.map(({ role, content }) => ({ role, content })), files: visible }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The AI didn't answer");
      const replySeq = log("ai_reply", { text: data.reply });
      setChat((c) => [...c, { role: "assistant", content: data.reply, seq: replySeq }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "The AI didn't answer");
    } finally {
      setThinking(false);
      void flush();
    }
  };

  const submitClosing = () => {
    const answer = closingText.trim();
    if (!answer) return;
    log("closing", { question: closingQuestions[closingIndex], answer });
    setClosingIndex((i) => i + 1);
    setClosingText("");
    void flush();
  };

  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => chatEnd.current?.scrollIntoView({ block: "end" }), [chat, thinking]);

  // ---------- render ----------
  const paths = Object.keys(files).sort((a, b) => {
    const rank = (p: string) => (p.startsWith("tests/") ? 2 : p === "conftest.py" ? 3 : p.endsWith(".md") ? 0 : 1);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const brief = problem.phases[phase - 1];

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-900">
        <Link href="/ai-round" className="text-gray-400 hover:text-white" title="Back (your session is saved)">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="font-semibold truncate">{problem.title}</p>
          <p className="text-xs text-gray-400">{format.name}</p>
        </div>
        <ol className="hidden md:flex items-center gap-1 ml-4">
          {problem.phases.map((p, i) => {
            const n = i + 1;
            return (
              <li
                key={n}
                className={cn(
                  "text-xs px-2 py-1 rounded-full border",
                  completed.has(n)
                    ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
                    : n === phase
                      ? "border-sky-500/60 text-sky-200 bg-sky-500/10"
                      : "border-gray-700 text-gray-500"
                )}
              >
                {completed.has(n) ? "✓ " : ""}
                {n}. {p.title}
              </li>
            );
          })}
        </ol>
        <div className="ml-auto flex items-center gap-3">
          <span className={cn("inline-flex items-center gap-1 font-mono text-sm", remaining < 5 * 60000 ? "text-red-400" : "text-gray-200")}>
            <Timer size={15} /> {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </span>
          <button
            onClick={runTests}
            disabled={running || runnerState !== "ready" || finishing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium disabled:opacity-50"
          >
            {running || runnerState === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {runnerState === "loading" ? "Loading Python…" : `Run tests (phase 1–${phase})`}
          </button>
          <button
            onClick={() => {
              if (allDone || confirm("Finish now? You can't continue this session afterwards.")) void finish("submitted");
            }}
            disabled={finishing || closingPending}
            title={closingPending ? "Answer the closing questions first" : ""}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-500 text-sm disabled:opacity-50"
          >
            {finishing ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />} Finish
          </button>
        </div>
      </header>

      {runnerState === "error" && (
        <div className="px-4 py-2 text-sm bg-red-500/10 text-red-300 border-b border-red-500/30">
          Couldn&apos;t load Python in your browser. Check your connection and reload the page; your work is saved.
        </div>
      )}

      <div className="flex-1 grid grid-cols-[280px_1fr_380px] min-h-0">
        {/* Left: brief + files */}
        <aside className="border-r border-gray-800 flex flex-col min-h-0">
          <button
            onClick={() => setShowBrief((s) => !s)}
            className="flex items-center gap-1 px-3 py-2 text-xs uppercase tracking-wide text-gray-400 hover:text-white"
          >
            {showBrief ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Phase {phase}: {brief.title}
          </button>
          {showBrief && (
            <div className="px-3 pb-3 overflow-y-auto max-h-[55%] border-b border-gray-800">
              <Markdown>{brief.brief}</Markdown>
            </div>
          )}
          <p className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-400">Files</p>
          <nav className="flex-1 overflow-y-auto px-1 pb-3">
            {paths.map((p) => (
              <button
                key={p}
                onClick={() => setActive(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm font-mono",
                  p === active ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/50"
                )}
              >
                {p.endsWith(".md") ? <FileText size={13} /> : <FileCode2 size={13} />}
                <span className="truncate">{p}</span>
                {isReadOnly(p) && <Lock size={11} className="ml-auto text-gray-500 shrink-0" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Center: editor + results */}
        <section className="flex flex-col min-h-0 min-w-0">
          <div className="flex-1 min-h-0">
            <Editor
              path={active}
              value={files[active] ?? ""}
              language={active.endsWith(".py") ? "python" : "markdown"}
              theme="vs-dark"
              onMount={onMount}
              onChange={(v) => {
                if (isReadOnly(active)) return;
                setFiles((f) => ({ ...f, [active]: v ?? "" }));
                dirty.current = true;
              }}
              options={{
                readOnly: isReadOnly(active) || finishing,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="h-56 border-t border-gray-800 overflow-y-auto p-3 text-sm">
            {!result ? (
              <p className="text-gray-500">Run the tests to see results. Tests and conftest.py are read-only.</p>
            ) : result.error ? (
              <p className="text-red-300">{result.error}</p>
            ) : (
              <div className="space-y-2">
                <p className={cn("font-medium", result.ok ? "text-emerald-300" : "text-amber-300")}>
                  {result.passed} / {result.total} passed
                  {result.ok && (allDone ? " · all phases complete" : " · next phase unlocked")}
                </p>
                <ul className="space-y-1">
                  {result.tests
                    .filter((t) => t.outcome !== "passed")
                    .map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() =>
                            setOpenTests((s) => {
                              const n = new Set(s);
                              if (n.has(t.id)) n.delete(t.id);
                              else n.add(t.id);
                              return n;
                            })
                          }
                          className="flex items-center gap-2 text-left font-mono text-xs text-red-300 hover:text-red-200"
                        >
                          <CircleX size={13} /> {t.id}
                        </button>
                        {openTests.has(t.id) && t.message && (
                          <pre className="mt-1 ml-5 text-xs text-gray-300 bg-gray-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {t.message}
                          </pre>
                        )}
                      </li>
                    ))}
                  {result.passed > 0 && (
                    <li className="flex items-center gap-2 text-xs text-emerald-400/80">
                      <CheckCircle2 size={13} /> {result.passed} passing
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right: AI */}
        <aside className="border-l border-gray-800 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 text-sm">
            <Bot size={16} /> AI assistant
            <span className="text-xs text-gray-500 ml-auto">reads your files · can&apos;t edit them</span>
          </div>

          {closingPending ? (
            <div className="p-4 space-y-3">
              <p className="text-sm text-emerald-300">All phases complete. Last step: explain your choices.</p>
              <p className="text-sm font-medium">
                {closingIndex + 1}/{closingQuestions.length}. {closingQuestions[closingIndex]}
              </p>
              <textarea
                value={closingText}
                onChange={(e) => setClosingText(e.target.value)}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500"
              />
              <button
                onClick={submitClosing}
                disabled={closingText.trim().length < 15}
                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm disabled:opacity-50"
              >
                Save answer
              </button>
            </div>
          ) : !format.aiAllowed ? (
            <div className="p-4 text-sm text-gray-400 space-y-2">
              <p>The AI is off in this format, like most classic interview loops.</p>
              <p>Talk through your approach as you go: write notes as comments in the code if it helps.</p>
            </div>
          ) : !hasKey ? (
            <div className="p-4 text-sm text-gray-400">
              Connect your AI on the <Link href="/ai-round" className="text-blue-400">AI Round page</Link> to use the chat.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chat.length === 0 && !chatLocked && (
                  <p className="text-sm text-gray-500">
                    Ask about the code, an approach, or a function. Small, specific asks work best, and test what you paste.
                  </p>
                )}
                {chat.map((m) => (
                  <div
                    key={m.seq}
                    className={cn(
                      "rounded-lg p-3",
                      m.role === "user" ? "bg-sky-500/10 border border-sky-500/20 ml-6" : "bg-gray-900 border border-gray-800"
                    )}
                  >
                    {m.role === "user" ? <p className="text-sm whitespace-pre-wrap">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                  </div>
                ))}
                {thinking && (
                  <p className="text-sm text-gray-400 inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Thinking…
                  </p>
                )}
                {chatError && <p className="text-sm text-red-400">{chatError}</p>}
                <div ref={chatEnd} />
              </div>

              {chatLocked ? (
                <div className="border-t border-gray-800 p-3 space-y-2 bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-amber-300 inline-flex items-center gap-1">
                    <Lock size={12} /> Think first
                  </p>
                  <p className="text-sm">
                    {needsClarify
                      ? "Before the AI unlocks: write the clarifying questions you'd ask the interviewer, and the assumptions you'll make."
                      : format.thinkFirst}
                  </p>
                  <textarea
                    value={gateText}
                    onChange={(e) => setGateText(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={submitGate}
                    disabled={gateText.trim().length < (needsClarify ? 40 : 15)}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm disabled:opacity-50"
                  >
                    Unlock AI
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-800 p-3 flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    placeholder="Ask the AI… (Enter to send)"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={thinking || !draft.trim()}
                    className="px-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

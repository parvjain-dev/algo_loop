"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trophy, Lock, Timer, ExternalLink, CheckCircle2, Circle, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CONTEST_MIN_PROBLEMS,
  CONTEST_MINUTES,
  CONTEST_POINTS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
} from "@/lib/constants";
import {
  computeMasterStreak,
  deadlineOf,
  formatClock,
  getNextWeekStart,
  getWeekStart,
  isFinished,
  pickContestProblems,
  scoreOf,
  totalSeconds,
  weekLabel,
} from "@/lib/contest";
import type { ContestAttempt, Problem } from "@/lib/types";

type PoolProblem = Pick<Problem, "id" | "name" | "link" | "pattern" | "difficulty">;

const UNLOCK_COUNT = CONTEST_MIN_PROBLEMS + 1; // "more than 10" => 11+
const MAX_SCORE = CONTEST_POINTS.reduce((a, b) => a + b, 0);

function timeUntil(target: Date, now: Date): string {
  const mins = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
}

export function ContestClient({ problems, attempts: initial }: { problems: PoolProblem[]; attempts: ContestAttempt[] }) {
  const [attempts, setAttempts] = useState<ContestAttempt[]>(initial);
  const [now, setNow] = useState<Date | null>(null); // null until mounted (avoids hydration mismatch)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const autoSubmitted = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // first tick after mount, so SSR and client markup match
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const currentWeek = now ? getWeekStart(now) : null;
  const current = attempts.find((a) => a.week_start === currentWeek) ?? null;
  const finished = current && now ? isFinished(current, now) : false;
  const masterStreak = now ? computeMasterStreak(attempts, now) : 0;

  const persistSubmit = useCallback(async (attempt: ContestAttempt, at: Date) => {
    const { score, solved } = scoreOf(attempt.problems);
    const submitted_at = at.toISOString();
    const supabase = createClient();
    const { error: err } = await supabase
      .from("contest_attempts")
      .update({ submitted_at, score, solved_count: solved })
      .eq("id", attempt.id);
    if (err) {
      setError("Couldn't save your submission. Check your connection and try again.");
      return;
    }
    setAttempts((prev) =>
      prev.map((a) => (a.id === attempt.id ? { ...a, submitted_at, score, solved_count: solved } : a))
    );
  }, []);

  // Auto-submit once when the timer runs out
  useEffect(() => {
    if (!now || !current || current.submitted_at) return;
    if (now >= deadlineOf(current) && autoSubmitted.current !== current.id) {
      autoSubmitted.current = current.id;
      void persistSubmit(current, deadlineOf(current));
    }
  }, [now, current, persistSubmit]);

  const handleStart = async () => {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const picked = pickContestProblems(problems);
    const startedAt = new Date();
    const { data, error: err } = await supabase
      .from("contest_attempts")
      .insert({
        user_id: user.id,
        week_start: getWeekStart(startedAt),
        problems: picked,
        duration_seconds: totalSeconds(picked),
        started_at: startedAt.toISOString(),
      })
      .select()
      .single();
    if (err || !data) {
      setError(
        err?.code === "23505"
          ? "This week's contest was already started. Refresh the page."
          : "Couldn't start the contest. Please try again."
      );
      setBusy(false);
      return;
    }
    setAttempts((prev) => [data as ContestAttempt, ...prev]);
    setBusy(false);
  };

  const handleToggle = async (index: number) => {
    if (!current || !now || isFinished(current, now)) return;
    setError("");
    const before = current.problems;
    const updated = before.map((p, i) => (i === index ? { ...p, solved: !p.solved } : p));
    const { score, solved } = scoreOf(updated);
    const apply = (problemsList: typeof updated, s: number, n: number) =>
      setAttempts((prev) =>
        prev.map((a) => (a.id === current.id ? { ...a, problems: problemsList, score: s, solved_count: n } : a))
      );

    apply(updated, score, solved);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("contest_attempts")
      .update({ problems: updated, score, solved_count: solved })
      .eq("id", current.id);
    if (err) {
      const old = scoreOf(before);
      apply(before, old.score, old.solved);
      setError("Couldn't save that change. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!current) return;
    if (!window.confirm("Submit your contest now? You won't be able to change your answers.")) return;
    await persistSubmit(current, new Date());
  };

  if (!now) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const unlocked = problems.length >= UNLOCK_COUNT;
  const past = attempts.filter((a) => a.id !== current?.id && isFinished(a, now));

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Weekly Contest</h1>

      {/* Master streak */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-5 flex items-center gap-4">
        <Trophy size={36} className="text-yellow-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Master Streak</p>
          <p className="text-4xl font-bold">
            {masterStreak}{" "}
            <span className="text-base font-normal text-gray-400">{masterStreak === 1 ? "week" : "weeks"}</span>
          </p>
        </div>
        <p className="ml-auto text-xs text-gray-500 max-w-[220px] text-right">
          Consecutive weeks with at least one contest problem solved.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Locked */}
      {!current && !unlocked && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-300">
            <Lock size={18} /> <h2 className="font-semibold">Contest locked</h2>
          </div>
          <p className="text-sm text-gray-400">
            Add more than {CONTEST_MIN_PROBLEMS} problems to unlock the weekly contest. You have{" "}
            <b className="text-white">{problems.length}</b> so far — {UNLOCK_COUNT - problems.length} more to go.
          </p>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${Math.min(100, (problems.length / UNLOCK_COUNT) * 100)}%` }}
            />
          </div>
          <Link href="/problems" className="inline-block text-sm text-blue-400 hover:text-blue-300">
            Add problems →
          </Link>
        </div>
      )}

      {/* Ready to start */}
      {!current && unlocked && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">This week&apos;s contest is ready</h2>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>4 problems picked at random from everything you&apos;ve added: 1 Easy, 2 Medium, 1 Hard.</li>
            <li>
              Time per problem: Easy {CONTEST_MINUTES.easy} min · Medium {CONTEST_MINUTES.medium} min · Hard{" "}
              {CONTEST_MINUTES.hard} min — one shared countdown (usually{" "}
              {CONTEST_MINUTES.easy + 2 * CONTEST_MINUTES.medium + CONTEST_MINUTES.hard} min).
            </li>
            <li>Points rise with each question: {CONTEST_POINTS.join(" · ")} (max {MAX_SCORE}).</li>
            <li>One attempt per week. The timer starts when you press Start and keeps running if you leave.</li>
          </ul>
          <button
            onClick={handleStart}
            disabled={busy}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Play size={16} /> {busy ? "Starting..." : "Start contest"}
          </button>
          <p className="text-xs text-gray-500">Week closes in {timeUntil(getNextWeekStart(now), now)}.</p>
        </div>
      )}

      {/* Running */}
      {current && !finished && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center space-y-1">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Timer size={14} /> Time remaining
            </p>
            {(() => {
              const remaining = (deadlineOf(current).getTime() - now.getTime()) / 1000;
              return (
                <p
                  className={`text-5xl font-mono font-bold ${remaining < 300 ? "text-red-400" : "text-green-400"}`}
                >
                  {formatClock(remaining)}
                </p>
              );
            })()}
            <p className="text-xs text-gray-500">
              Score: <b className="text-white">{current.score}</b> / {MAX_SCORE}
            </p>
          </div>

          <ProblemList attempt={current} onToggle={handleToggle} interactive />

          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Submit contest
          </button>
        </>
      )}

      {/* Finished this week */}
      {current && finished && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg">This week&apos;s result</h2>
            <div className="flex flex-wrap gap-8">
              <Stat label="Score" value={`${current.score} / ${MAX_SCORE}`} />
              <Stat label="Solved" value={`${current.solved_count} / ${current.problems.length}`} />
              <Stat
                label="Time used"
                value={formatClock(
                  ((current.submitted_at ? new Date(current.submitted_at) : deadlineOf(current)).getTime() -
                    new Date(current.started_at).getTime()) /
                    1000
                )}
              />
            </div>
            <p className="text-xs text-gray-500">Next contest opens in {timeUntil(getNextWeekStart(now), now)} (Monday).</p>
          </div>
          <ProblemList attempt={current} onToggle={handleToggle} interactive={false} />
        </>
      )}

      {/* History */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Past contests</h2>
          <div className="space-y-2">
            {past.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm"
              >
                <span>{weekLabel(a.week_start)}</span>
                <span className="text-gray-400">
                  {a.solved_count}/{a.problems.length} solved · <b className="text-white">{a.score}</b> pts
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ProblemList({
  attempt,
  onToggle,
  interactive,
}: {
  attempt: ContestAttempt;
  onToggle: (index: number) => void;
  interactive: boolean;
}) {
  return (
    <div className="space-y-2">
      {attempt.problems.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center justify-between gap-3 bg-gray-900 border rounded-lg p-4 ${
            p.solved ? "border-green-800" : "border-gray-800"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Q{i + 1}</span>
              <p className="font-medium truncate">{p.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_COLORS[p.difficulty]}`}>
                {DIFFICULTY_LABELS[p.difficulty]}
              </span>
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener" className="text-blue-400" aria-label="Open problem">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {p.pattern} · {p.points} pts · {p.minutes} min
            </p>
          </div>
          {interactive ? (
            <button
              onClick={() => onToggle(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                p.solved ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {p.solved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {p.solved ? "Solved" : "Mark solved"}
            </button>
          ) : (
            <span className={`flex items-center gap-1.5 text-sm ${p.solved ? "text-green-400" : "text-gray-500"}`}>
              {p.solved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {p.solved ? "Solved" : "Not solved"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

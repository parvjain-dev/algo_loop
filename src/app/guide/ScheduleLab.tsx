"use client";

import { useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { SOLVE_METHOD_DAYS, type SolveMethod } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * A playable version of the revision schedule: solve a problem, say how it
 * went, and see where the next revision lands. Uses the app's real intervals.
 */

const METHODS: { id: SolveMethod; short: string; dot: string; text: string }[] = [
  { id: "under_25", short: "Under 25 min", dot: "bg-emerald-400", text: "text-emerald-300" },
  { id: "over_25", short: "Over 25 min", dot: "bg-amber-400", text: "text-amber-300" },
  { id: "with_hints", short: "With hints", dot: "bg-orange-400", text: "text-orange-300" },
  { id: "with_solution", short: "With the solution", dot: "bg-rose-400", text: "text-rose-300" },
];
const style = (m: SolveMethod) => METHODS.find((x) => x.id === m)!;

type Round = { day: number; method: SolveMethod };

export function ScheduleLab() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [mastered, setMastered] = useState(false);

  const nextDay = rounds.length ? rounds.at(-1)!.day + SOLVE_METHOD_DAYS[rounds.at(-1)!.method] : 0;
  const span = Math.max(45, nextDay + 10);
  const pos = (day: number) => `${(day / span) * 100}%`;

  const pick = (method: SolveMethod) => setRounds((r) => [...r, { day: nextDay, method }]);
  const reset = () => {
    setRounds([]);
    setMastered(false);
  };

  const prompt = mastered
    ? `Mastered on day ${rounds.at(-1)!.day}, after ${rounds.length} ${rounds.length === 1 ? "solve" : "solves"}. It leaves your queue for good.`
    : rounds.length === 0
      ? "Day 0. You just solved Two Sum for the first time. How did it go?"
      : `Day ${nextDay}. Two Sum is back in Today for revision ${rounds.length}. How did it go this time?`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-lg font-medium text-white max-w-xl" aria-live="polite">
          {prompt}
        </p>
        {rounds.length > 0 && (
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <RotateCcw size={14} /> Start over
          </button>
        )}
      </div>

      {!mastered && (
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className="group inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 hover:border-gray-500 px-3.5 py-2 text-sm"
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", m.dot)} />
              {m.short}
              <span className="text-gray-500 group-hover:text-gray-300 tabular">+{SOLVE_METHOD_DAYS[m.id]}d</span>
            </button>
          ))}
          {rounds.length > 0 && (
            <button
              onClick={() => setMastered(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 text-sm font-medium"
            >
              <Trophy size={14} /> Done &amp; Dusted
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="pt-2">
        <div className="relative h-16">
          <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-gray-800" />
          {rounds.map((r, i) => {
            const end = i < rounds.length - 1 ? rounds[i + 1].day : mastered ? r.day : r.day + SOLVE_METHOD_DAYS[r.method];
            return (
              <div
                key={`seg-${i}`}
                className={cn("absolute top-6 h-1 rounded-full opacity-70", style(r.method).dot)}
                style={{ left: pos(r.day), width: `calc(${pos(end)} - ${pos(r.day)})` }}
              />
            );
          })}
          {rounds.map((r, i) => (
            <div key={`dot-${i}`} className="absolute top-4 -translate-x-1/2 ar-in" style={{ left: pos(r.day) }}>
              <span className={cn("block w-5 h-5 rounded-full ring-4 ring-gray-900", style(r.method).dot)} />
              <span className="absolute top-7 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap tabular">
                Day {r.day}
              </span>
            </div>
          ))}
          {!mastered && (
            <div className="absolute top-4 -translate-x-1/2" style={{ left: pos(nextDay) }}>
              <span className="block w-5 h-5 rounded-full border-2 border-dashed border-gray-500 bg-gray-900 animate-pulse motion-reduce:animate-none" />
              <span className="absolute top-7 left-1/2 -translate-x-1/2 text-xs text-white font-medium whitespace-nowrap tabular">
                {rounds.length === 0 ? "Today" : `Day ${nextDay}`}
              </span>
            </div>
          )}
          {mastered && (
            <div className="absolute -top-1 -translate-x-1/2 text-green-400 ar-in" style={{ left: pos(rounds.at(-1)!.day) }}>
              <Trophy size={16} />
            </div>
          )}
        </div>
      </div>

      {rounds.length > 0 && (
        <ol className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
          {rounds.map((r, i) => (
            <li key={i} className="tabular">
              Day {r.day}: <span className={style(r.method).text}>{style(r.method).short.toLowerCase()}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-gray-500">
        Try it twice: once solving it fast every time, once needing hints. The struggling version comes back far more often,
        and that&apos;s the point. In the real app, a full day moves the extra problem to the next day with room.
      </p>
    </div>
  );
}

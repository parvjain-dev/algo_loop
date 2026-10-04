import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { DAILY_CAP } from "@/lib/constants";
import type { Problem } from "@/lib/types";

/**
 * Daily cap scheduling. Everything here uses the viewer's LOCAL calendar days,
 * so it must run in the browser (the server runs in UTC).
 */

type Schedulable = Pick<Problem, "id" | "next_revision" | "completed" | "effort">;

const KEY = "yyyy-MM-dd";

export function localDayKey(date: Date | string): string {
  return format(new Date(date), KEY);
}

// Lower = was harder last time = comes first
const EFFORT_RANK: Record<string, number> = {
  with_solution: 0,
  with_hints: 1,
  over_25: 2,
  under_25: 3,
};

/** How many not-yet-mastered problems sit on each LOCAL day, from `fromDay` onwards. */
function occupancy(problems: Schedulable[], fromDay: Date, skipIds: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  const from = localDayKey(fromDay);
  for (const p of problems) {
    if (p.completed || skipIds.has(p.id)) continue;
    const key = localDayKey(p.next_revision);
    if (key < from) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** First day on/after `target` with fewer than `cap` problems. Mutates `counts`. */
function takeFreeDay(counts: Map<string, number>, target: Date, cap: number): Date {
  let day = startOfDay(target);
  while ((counts.get(localDayKey(day)) || 0) >= cap) day = addDays(day, 1);
  counts.set(localDayKey(day), (counts.get(localDayKey(day)) || 0) + 1);
  return day;
}

/**
 * Pick the revision day for a problem being scheduled now (new problem, or the
 * next revision after finishing one). `target` is the ideal day; if that day is
 * full we use the next one with room. `selfId` is excluded from the count.
 */
export function pickRevisionDay(
  problems: Schedulable[],
  target: Date,
  selfId?: string,
  cap: number = DAILY_CAP
): Date {
  const counts = occupancy(problems, target, new Set(selfId ? [selfId] : []));
  return takeFreeDay(counts, target, cap);
}

export type PlannedMove = { id: string; from: string; to: Date };

export type DayPlan<T> = {
  /** Problems that stay on today's list (at most `cap`). */
  keep: T[];
  /** Overflow that has to move, with the day each one goes to. */
  moves: PlannedMove[];
};

/**
 * Decide today's list. Overdue first (most overdue first), then the problems that
 * were hardest last time, then the oldest. The first `cap` stay; the rest are
 * assigned to the nearest following days that still have room.
 */
export function planToday<T extends Schedulable>(problems: T[], now: Date = new Date(), cap: number = DAILY_CAP): DayPlan<T> {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const todayKey = localDayKey(today);

  const due = problems.filter((p) => !p.completed && localDayKey(p.next_revision) <= todayKey);

  const overdueDays = (p: T) => Math.max(0, differenceInCalendarDays(today, new Date(p.next_revision)));
  const ranked = [...due].sort(
    (a, b) =>
      overdueDays(b) - overdueDays(a) ||
      (EFFORT_RANK[a.effort] ?? 9) - (EFFORT_RANK[b.effort] ?? 9) ||
      new Date(a.next_revision).getTime() - new Date(b.next_revision).getTime() ||
      a.id.localeCompare(b.id)
  );

  const keep = ranked.slice(0, cap);
  const overflow = ranked.slice(cap);
  if (!overflow.length) return { keep, moves: [] };

  const counts = occupancy(problems, tomorrow, new Set(due.map((p) => p.id)));
  const moves = overflow.map((p) => ({
    id: p.id,
    from: p.next_revision,
    to: takeFreeDay(counts, tomorrow, cap),
  }));
  return { keep, moves };
}

/** Apply a plan to a list (new dates for moved problems). */
export function applyMoves<T extends Schedulable>(problems: T[], moves: PlannedMove[]): T[] {
  if (!moves.length) return problems;
  const byId = new Map(moves.map((m) => [m.id, m.to]));
  return problems.map((p) => (byId.has(p.id) ? { ...p, next_revision: byId.get(p.id)!.toISOString() } : p));
}

/** "Mon 5 Oct (1), Tue 6 Oct (2)" */
export function describeMoves(moves: PlannedMove[]): string {
  const byDay = new Map<string, { date: Date; n: number }>();
  for (const m of moves) {
    const k = localDayKey(m.to);
    byDay.set(k, { date: m.to, n: (byDay.get(k)?.n || 0) + 1 });
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => `${format(v.date, "EEE d MMM")} (${v.n})`)
    .join(", ");
}

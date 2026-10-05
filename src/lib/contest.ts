import { format, parse, startOfWeek, subWeeks, addWeeks } from "date-fns";
import {
  CONTEST_MINUTES,
  CONTEST_MIX,
  CONTEST_POINTS,
  CONTEST_SIZE,
  DIFFICULTIES,
} from "@/lib/constants";
import { getPatterns } from "@/lib/utils";
import type { ContestAttempt, ContestProblem, Difficulty, Problem } from "@/lib/types";

const KEY = "yyyy-MM-dd";

/** Monday of the week containing `date`, as yyyy-MM-dd (local time). */
export function getWeekStart(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), KEY);
}

/** Start of the next contest week (next Monday, 00:00 local). */
export function getNextWeekStart(date: Date): Date {
  return addWeeks(startOfWeek(date, { weekStartsOn: 1 }), 1);
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PoolProblem = Pick<Problem, "id" | "name" | "link" | "pattern" | "patterns" | "difficulty">;

/**
 * Pick the contest: 1 easy, 2 medium, 1 hard from ALL the user's problems
 * (any status). If a difficulty runs short, fill from whatever is left.
 * Result is sorted easy -> hard and gets LeetCode-style rising points.
 */
export function pickContestProblems(problems: PoolProblem[]): ContestProblem[] {
  const pools: Record<Difficulty, PoolProblem[]> = { easy: [], medium: [], hard: [] };
  for (const p of problems) (pools[p.difficulty] ?? pools.medium).push(p);

  const picked: PoolProblem[] = [];
  const used = new Set<string>();

  for (const d of DIFFICULTIES) {
    for (const p of shuffle(pools[d]).slice(0, CONTEST_MIX[d])) {
      picked.push(p);
      used.add(p.id);
    }
  }

  if (picked.length < CONTEST_SIZE) {
    const rest = shuffle(problems.filter((p) => !used.has(p.id)));
    picked.push(...rest.slice(0, CONTEST_SIZE - picked.length));
  }

  const order = (d: Difficulty) => DIFFICULTIES.indexOf(d);
  return picked
    .sort((a, b) => order(a.difficulty) - order(b.difficulty))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      link: p.link,
      pattern: getPatterns(p).join(", "),
      difficulty: p.difficulty,
      points: CONTEST_POINTS[i] ?? CONTEST_POINTS[CONTEST_POINTS.length - 1],
      minutes: CONTEST_MINUTES[p.difficulty] ?? CONTEST_MINUTES.medium,
      solved: false,
    }));
}

export function totalSeconds(problems: ContestProblem[]): number {
  return problems.reduce((sum, p) => sum + p.minutes, 0) * 60;
}

export function scoreOf(problems: ContestProblem[]): { score: number; solved: number } {
  let score = 0;
  let solved = 0;
  for (const p of problems) {
    if (p.solved) {
      score += p.points;
      solved++;
    }
  }
  return { score, solved };
}

export function deadlineOf(attempt: Pick<ContestAttempt, "started_at" | "duration_seconds">): Date {
  return new Date(new Date(attempt.started_at).getTime() + attempt.duration_seconds * 1000);
}

/** An attempt is finished once submitted, or once its timer has run out. */
export function isFinished(attempt: ContestAttempt, now: Date): boolean {
  return attempt.submitted_at !== null || now >= deadlineOf(attempt);
}

/**
 * Master streak = consecutive contest weeks (ending this week, or last week if
 * this week isn't done yet) in which at least one problem was solved.
 */
export function computeMasterStreak(attempts: ContestAttempt[], now: Date): number {
  const qualifying = new Set(
    attempts.filter((a) => a.solved_count >= 1 && isFinished(a, now)).map((a) => a.week_start)
  );

  let cursor = startOfWeek(now, { weekStartsOn: 1 });
  if (!qualifying.has(format(cursor, KEY))) cursor = subWeeks(cursor, 1);

  let streak = 0;
  while (qualifying.has(format(cursor, KEY))) {
    streak++;
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}

export function formatClock(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function weekLabel(weekStart: string): string {
  return `Week of ${format(parse(weekStart, KEY, new Date()), "MMM d, yyyy")}`;
}

import { format, subDays, parse, differenceInCalendarDays } from "date-fns";
import type { Revision } from "@/lib/types";

const KEY = "yyyy-MM-dd";

export function dayKey(date: Date): string {
  return format(date, KEY);
}

/** Number of solves/revisions per local calendar day. */
export function buildActivity(revisions: Pick<Revision, "completed_at">[]): Record<string, number> {
  const activity: Record<string, number> = {};
  for (const r of revisions) {
    const key = dayKey(new Date(r.completed_at));
    activity[key] = (activity[key] || 0) + 1;
  }
  return activity;
}

export type StreakStats = {
  current: number;
  longest: number;
  activeDays: number;
  total: number;
};

export function computeStreaks(activity: Record<string, number>, now: Date = new Date()): StreakStats {
  const keys = Object.keys(activity).sort();
  const total = keys.reduce((sum, k) => sum + activity[k], 0);

  // Longest streak: walk sorted days, extend while consecutive
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = parse(k, KEY, new Date());
    run = prev && differenceInCalendarDays(d, prev) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Current streak: counts back from today, or from yesterday if nothing yet today
  let current = 0;
  let cursor = activity[dayKey(now)] ? now : subDays(now, 1);
  while (activity[dayKey(cursor)]) {
    current++;
    cursor = subDays(cursor, 1);
  }

  return { current, longest, activeDays: keys.length, total };
}

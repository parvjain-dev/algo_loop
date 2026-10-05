import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * True if a revision date falls on or before the end of the viewer's "today".
 * Must run in the browser: the server runs in UTC, so its idea of "tomorrow"
 * starts hours after the user's (e.g. IST), which wrongly pulls tomorrow's items into today.
 */
export function isDueByToday(nextRevision: string, now: Date = new Date()): boolean {
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return new Date(nextRevision) < startOfTomorrow;
}

/**
 * All patterns of a problem. Falls back to the single legacy `pattern` column
 * for rows created before multi-pattern support.
 */
export function getPatterns(p: { pattern: string; patterns?: string[] | null }): string[] {
  if (p.patterns && p.patterns.length > 0) return p.patterns;
  return p.pattern ? [p.pattern] : [];
}

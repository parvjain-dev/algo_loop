import { addDays } from "date-fns";

export type SolveMethod = "under_25" | "over_25" | "with_hints" | "with_solution";

export const SOLVE_METHOD_DAYS: Record<SolveMethod, number[]> = {
  under_25: [14, 30, 60],        // Solved < 25 min → revise after 14, 30, 60 days
  over_25: [7, 14, 30, 60],      // Solved > 25 min → revise after 7, 14, 30, 60 days
  with_hints: [3, 7, 14, 30],    // Solved with hints → revise after 3, 7, 14, 30 days
  with_solution: [1, 3, 7, 14, 30], // Solved with solution → revise after 1, 3, 7, 14, 30 days
};

export function getNextRevisionDate(method: SolveMethod, revisionCount: number): Date {
  const schedule = SOLVE_METHOD_DAYS[method];
  const daysToAdd = schedule[Math.min(revisionCount, schedule.length - 1)];
  return addDays(new Date(), daysToAdd);
}

export const PATTERNS = [
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Stack",
  "Linked List",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Heap/Priority Queue",
  "Trie",
  "Union Find",
  "Bit Manipulation",
  "Math",
  "Other",
] as const;

export type Pattern = (typeof PATTERNS)[number];

export const SOLVE_METHOD_LABELS: Record<SolveMethod, string> = {
  under_25: "Solved in < 25 min",
  over_25: "Solved in > 25 min",
  with_hints: "Solved with hints",
  with_solution: "Solved with solution",
};

import { addDays } from "date-fns";

export type SolveMethod = "under_25" | "over_25" | "with_hints" | "with_solution";

export const SOLVE_METHOD_DAYS: Record<SolveMethod, number> = {
  under_25: 14,
  over_25: 7,
  with_hints: 3,
  with_solution: 1,
};

export function getNextRevisionDate(method: SolveMethod): Date {
  return addDays(new Date(), SOLVE_METHOD_DAYS[method]);
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

import { addDays, startOfDay } from "date-fns";

export type SolveMethod = "under_25" | "over_25" | "with_hints" | "with_solution";

export const SOLVE_METHOD_DAYS: Record<SolveMethod, number> = {
  under_25: 14,
  over_25: 7,
  with_hints: 3,
  with_solution: 1,
};

export function getNextRevisionDate(method: SolveMethod): Date {
  // Always set to start of the target day so timezone comparisons work
  return startOfDay(addDays(new Date(), SOLVE_METHOD_DAYS[method]));
}

export const PATTERNS = [
  "Two Pointers",
  "Prefix Sum",
  "Sliding Window",
  "Matrix / 2D Grid",
  "Intervals",
  "Binary Search",
  "Stack",
  "Monotonic Stack",
  "Linked List",
  "Trees",
  "Graphs",
  "Topological Sort",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Heap/Priority Queue",
  "Trie",
  "Union Find",
  "Divide and Conquer",
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

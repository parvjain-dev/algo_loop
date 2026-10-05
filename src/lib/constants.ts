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
  "Arrays",
  "Strings",
  "Hashing / Hash Map",
  "Sorting",
  "Recursion",
  "Bitmask DP",
  "Segment Tree / Fenwick Tree",
  "Design",
  "Simulation",
  "Other",
] as const;

export type Pattern = (typeof PATTERNS)[number];

export const SOLVE_METHOD_LABELS: Record<SolveMethod, string> = {
  under_25: "Solved in < 25 min",
  over_25: "Solved in > 25 min",
  with_hints: "Solved with hints",
  with_solution: "Solved with solution",
};

// ---------- Difficulty & weekly contest ----------

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const DIFFICULTY_LABELS: Record<(typeof DIFFICULTIES)[number], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_COLORS: Record<(typeof DIFFICULTIES)[number], string> = {
  easy: "bg-green-900/40 text-green-400",
  medium: "bg-yellow-900/40 text-yellow-400",
  hard: "bg-red-900/40 text-red-400",
};

// Minutes allowed per problem, by difficulty
export const CONTEST_MINUTES: Record<(typeof DIFFICULTIES)[number], number> = {
  easy: 20,
  medium: 30,
  hard: 50,
};

// LeetCode-style: points rise with each question (sorted easy -> hard)
export const CONTEST_POINTS = [3, 4, 5, 6] as const;

// Standard mix: 1 easy, 2 medium, 1 hard (filled from what the user has if short)
export const CONTEST_MIX: Record<(typeof DIFFICULTIES)[number], number> = {
  easy: 1,
  medium: 2,
  hard: 1,
};

export const CONTEST_SIZE = 4;

// Contest unlocks when the user has MORE than this many problems
export const CONTEST_MIN_PROBLEMS = 10;

// ---------- Daily limit ----------

// Max problems that can be due on any single day. Extras are moved to the next day with room.
export const DAILY_CAP = 3;

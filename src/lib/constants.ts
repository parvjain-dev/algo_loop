import { addDays } from "date-fns";

export type Effort = "low" | "medium" | "high";

export const EFFORT_DAYS: Record<Effort, number[]> = {
  high: [1, 3, 7, 14, 30],
  medium: [2, 5, 14, 30],
  low: [3, 7, 30],
};

export function getNextRevisionDate(effort: Effort, revisionCount: number): Date {
  const schedule = EFFORT_DAYS[effort];
  const daysToAdd = schedule[Math.min(revisionCount, schedule.length - 1)];
  return addDays(new Date(), daysToAdd);
}

export const PATTERNS = [
  "Array and Hashmap",
  "Prefix Sum",
  "Two Pointers",
  "Sliding Window",
  "Intervals",
  "Matrix / 2D Grid ",
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

export type Difficulty = "easy" | "medium" | "hard";

export type Problem = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  link: string;
  pattern: string; // primary (first) pattern, kept for backward compatibility
  patterns: string[]; // all patterns; use getPatterns() to read safely
  effort: string;
  difficulty: Difficulty;
  revision_count: number;
  next_revision: string;
  completed: boolean;
  created_at: string;
};

export type Revision = {
  id: string;
  problem_id: string;
  user_id: string;
  completed_at: string;
  reflection: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  problem_id: string | null;
};

export type ContestProblem = {
  id: string;
  name: string;
  link: string;
  pattern: string;
  difficulty: Difficulty;
  points: number;
  minutes: number;
  solved: boolean;
};

export type ContestAttempt = {
  id: string;
  user_id: string;
  week_start: string; // yyyy-MM-dd (Monday)
  problems: ContestProblem[];
  duration_seconds: number;
  started_at: string;
  submitted_at: string | null;
  score: number;
  solved_count: number;
};

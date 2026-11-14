export type Provider = "gemini" | "openai" | "anthropic";

export type Files = Record<string, string>;

export type Phase = {
  title: string;
  /** Markdown shown when the phase unlocks. */
  brief: string;
  /** Test file for this phase, e.g. tests/test_part1.py. Hidden until the phase unlocks. */
  testPath: string;
};

/** What the student sees. The reference solution is never part of this. */
export type ProblemBundle = {
  title: string;
  summary: string;
  language: "python";
  /** Starter files, including tests/conftest.py if any, but NOT the phase test files. */
  files: Files;
  /** Phase test files, keyed by path. Revealed one phase at a time. */
  tests: Files;
  phases: Phase[];
};

/** Generator output: the bundle plus a reference solution used only for validation. */
export type GeneratedProblem = ProblemBundle & {
  /** Full contents of every source file after all phases are solved. */
  solution: Files;
};

export type EventType =
  | "session_start"
  | "phase_start"
  | "clarify"
  | "think_first"
  | "test_run"
  | "ai_user"
  | "ai_reply"
  | "paste"
  | "phase_complete"
  | "closing"
  | "session_end";

export type SessionEvent = {
  seq: number;
  type: EventType;
  t_ms: number;
  data: Record<string, unknown>;
};

export type TestResult = {
  id: string;
  outcome: "passed" | "failed" | "skipped" | "error";
  message?: string;
};

export type RunResult = {
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  tests: TestResult[];
  output: string;
  timedOut?: boolean;
  error?: string;
};

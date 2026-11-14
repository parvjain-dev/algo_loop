import type { SessionEvent } from "@/lib/ai-round/types";

/**
 * Facts computed from the event log by code, not by an AI. These are shown
 * to the student as-is and decide whether the review may suggest anything.
 */

export type Flag = { id: "untested-ai-code"; label: string; evidence: number[] };

export type Metrics = {
  minutes: number;
  phasesCompleted: number;
  phasesTotal: number;
  phaseMinutes: number[];
  testRuns: number;
  aiPrompts: number;
  minutesToFirstPrompt: number | null;
  aiCodePastes: number;
  aiPastesTested: number;
  thinkFirstAnswered: number;
  clarifyWritten: boolean;
  closingAnswered: number;
  flags: Flag[];
  /** All phases done, nothing flagged: the review stays positive-only. */
  strong: boolean;
};

const min = (ms: number) => Math.round((ms / 60000) * 10) / 10;

export function computeMetrics(events: SessionEvent[], phasesTotal: number, aiAllowed: boolean): Metrics {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const end = sorted.at(-1)?.t_ms ?? 0;

  const completions = sorted.filter((e) => e.type === "phase_complete");
  const phaseMinutes: number[] = [];
  let last = 0;
  for (const c of completions) {
    phaseMinutes.push(min(c.t_ms - last));
    last = c.t_ms;
  }

  const prompts = sorted.filter((e) => e.type === "ai_user");
  const aiPastes = sorted.filter((e) => e.type === "paste" && e.data.fromAi === true);

  // An AI paste counts as tested if a test run happens before the next prompt.
  const untested: number[] = [];
  for (const p of aiPastes) {
    const after = sorted.filter((e) => e.seq > p.seq);
    const nextRun = after.find((e) => e.type === "test_run");
    const nextPrompt = after.find((e) => e.type === "ai_user");
    const tested = nextRun && (!nextPrompt || nextRun.seq < nextPrompt.seq);
    if (!tested) untested.push(p.seq);
  }

  const flags: Flag[] = [];
  if (aiAllowed && untested.length > 0) {
    flags.push({
      id: "untested-ai-code",
      label: "Pasted AI code and moved on without running the tests",
      evidence: untested,
    });
  }

  const phasesCompleted = completions.length;
  return {
    minutes: min(end),
    phasesCompleted,
    phasesTotal,
    phaseMinutes,
    testRuns: sorted.filter((e) => e.type === "test_run").length,
    aiPrompts: prompts.length,
    minutesToFirstPrompt: prompts.length ? min(prompts[0].t_ms) : null,
    aiCodePastes: aiPastes.length,
    aiPastesTested: aiPastes.length - untested.length,
    thinkFirstAnswered: sorted.filter((e) => e.type === "think_first").length,
    clarifyWritten: sorted.some((e) => e.type === "clarify"),
    closingAnswered: sorted.filter((e) => e.type === "closing").length,
    flags,
    strong: phasesCompleted >= phasesTotal && flags.length === 0,
  };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Was this paste copied from the AI? True when the pasted text (40+ chars)
 * appears in one of the AI's replies, ignoring whitespace differences.
 */
export function pasteFromAi(pasted: string, aiReplies: string[]): boolean {
  const p = norm(pasted);
  if (p.length < 40) return false;
  return aiReplies.some((r) => norm(r).includes(p));
}
